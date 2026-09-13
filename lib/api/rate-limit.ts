import { env } from '@/lib/env'

/**
 * Rate limiting.
 *
 * Uses Redis when REDIS_URL is configured (shared across serverless instances,
 * which is what Vercel needs) and falls back to an in-process sliding window
 * for local development and tests.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let redisClient: { incr: (k: string) => Promise<number>; expire: (k: string, s: number) => Promise<unknown> } | null = null
let redisTried = false

async function getRedis() {
  if (redisTried) return redisClient
  redisTried = true
  if (!process.env.REDIS_URL) return null
  try {
    const segments = ['ioredis']
    const mod = (await import(/* webpackIgnore: true */ segments.join('/'))) as {
      default: new (url: string) => { incr: (k: string) => Promise<number>; expire: (k: string, s: number) => Promise<unknown> }
    }
    redisClient = new mod.default(process.env.REDIS_URL)
  } catch {
    redisClient = null
  }
  return redisClient
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

export async function rateLimit(key: string, overrides?: { max?: number; windowMs?: number }): Promise<RateLimitResult> {
  const windowMs = overrides?.windowMs ?? env.RATE_LIMIT_WINDOW_MS
  const max = overrides?.max ?? env.RATE_LIMIT_MAX
  const windowSeconds = Math.ceil(windowMs / 1000)
  const bucketKey = `ratelimit:${key}:${Math.floor(Date.now() / windowMs)}`

  const redis = await getRedis()
  if (redis) {
    try {
      const count = await redis.incr(bucketKey)
      if (count === 1) await redis.expire(bucketKey, windowSeconds)
      return {
        allowed: count <= max,
        limit: max,
        remaining: Math.max(0, max - count),
        resetAt: Date.now() + windowMs,
      }
    } catch {
      // Redis failure must not lock users out — fall through to local limiting.
    }
  }

  const now = Date.now()
  const bucket = buckets.get(bucketKey)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs })
    // Opportunistic cleanup so the map cannot grow without bound.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
    }
    return { allowed: true, limit: max, remaining: max - 1, resetAt: now + windowMs }
  }
  bucket.count += 1
  return {
    allowed: bucket.count <= max,
    limit: max,
    remaining: Math.max(0, max - bucket.count),
    resetAt: bucket.resetAt,
  }
}
