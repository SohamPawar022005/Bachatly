import { z } from 'zod'

/**
 * Environment access.
 *
 * Only DATABASE_URL and AUTH_SECRET are required. Every other service
 * (Redis, Resend, Cloudinary, Sentry, PostHog) is optional and the app must
 * degrade gracefully when it is missing.
 */

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
  AUTH_TRUST_HOST: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  BACHATLY_DB_ADAPTER: z.enum(['prisma', 'pg']).optional(),
  REDIS_URL: z.string().optional(),
  BULLMQ_QUEUE_NAME: z.string().default('bachatly-jobs'),
  PRICE_UPDATE_CRON: z.string().default('*/30 * * * *'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Bachatly <alerts@bachatly.app>'),
  CLOUDINARY_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  BACHATLY_DEMO_DATA: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null
let warned = false

function load(): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(
      `Invalid environment configuration. Copy .env.example to .env and fill in the required values:\n${issues}`,
    )
  }
  cached = parsed.data
  return cached
}

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return load()[prop as keyof Env]
  },
})

/** True when seeded demonstration data should be presented as demo (never "live"). */
export const isDemoData = () => load().BACHATLY_DEMO_DATA

export function optionalServiceStatus() {
  const e = load()
  return {
    redis: Boolean(e.REDIS_URL),
    email: Boolean(e.RESEND_API_KEY),
    storage: Boolean(e.CLOUDINARY_URL),
    monitoring: Boolean(e.SENTRY_DSN),
    analytics: Boolean(e.NEXT_PUBLIC_POSTHOG_KEY),
  }
}

/** One-time advisory so missing optional services are visible in dev logs. */
export function warnMissingOptionalServices() {
  if (warned || load().NODE_ENV === 'production') return
  warned = true
  const status = optionalServiceStatus()
  const missing = Object.entries(status)
    .filter(([, enabled]) => !enabled)
    .map(([name]) => name)
  if (missing.length) {
    console.info(
      `[bachatly] optional services disabled (no config): ${missing.join(', ')}. The app runs with reduced functionality.`,
    )
  }
}
