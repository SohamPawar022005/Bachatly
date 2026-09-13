import { NextResponse, type NextRequest } from 'next/server'
import { ZodError, type ZodType } from 'zod'

import { AppError, ERROR_CODES } from './errors'
import { fail } from './respond'
import { rateLimit } from './rate-limit'
import { getCurrentUser, requireAdmin, requireUser } from '@/lib/auth/guards'
import type { SessionUser } from '@/lib/auth'

type HandlerResult = NextResponse | Response

export interface RouteOptions<TInput> {
  /** 'public' (default) | 'user' | 'admin'. */
  auth?: 'public' | 'user' | 'admin'
  /** Validate the request body. */
  schema?: ZodType<TInput>
  /** Validate/transform query params. */
  querySchema?: ZodType<unknown>
  /** Rate limit key prefix. Mutating routes are limited more aggressively. */
  rateLimit?: { max: number; windowMs?: number } | false
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'local'
}

/**
 * Wraps a route handler with validation, authentication, rate limiting and a
 * single, consistent error envelope. Unexpected errors are logged server-side
 * and returned as a generic 500 — never as a stack trace.
 */
export function withApi<TCtx = unknown, TInput = unknown>(
  handler: (req: NextRequest, ctx: TCtx & { user: SessionUser | null }, input: TInput) => Promise<HandlerResult>,
  options: RouteOptions<TInput> = {},
) {
  return async (req: NextRequest, ctx: TCtx): Promise<HandlerResult> => {
    try {
      if (options.rateLimit !== false) {
        const isMutation = req.method !== 'GET' && req.method !== 'HEAD'
        const limit = options.rateLimit ?? (isMutation ? { max: 30, windowMs: 60_000 } : { max: 240, windowMs: 60_000 })
        const result = await rateLimit(`${req.method}:${req.nextUrl.pathname}:${clientIp(req)}`, limit)
        if (!result.allowed) {
          return fail(ERROR_CODES.RATE_LIMITED, 'Too many requests. Please try again shortly.', 429, {
            retryAfterMs: result.resetAt - Date.now(),
          })
        }
      }

      let user: SessionUser | null = null
      if (options.auth === 'admin') user = await requireAdmin()
      else if (options.auth === 'user') user = await requireUser()
      else user = await getCurrentUser()

      let input = undefined as TInput
      if (options.schema) {
        const body = await req.json().catch(() => null)
        input = options.schema.parse(body ?? {}) as TInput
      }
      if (options.querySchema) {
        const params = Object.fromEntries(req.nextUrl.searchParams.entries())
        options.querySchema.parse(params)
      }

      return await handler(req, { ...(ctx as object), user } as TCtx & { user: SessionUser | null }, input)
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(
          ERROR_CODES.VALIDATION_ERROR,
          error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '),
          400,
          error.issues,
        )
      }
      if (error instanceof AppError) {
        return fail(error.code, error.message, error.status, error.details)
      }
      // Next.js signals redirects and not-found through thrown errors with a
      // digest. They must propagate so the framework can turn them into a real
      // response — signIn/signOut rely on this.
      const digest = (error as { digest?: string } | null)?.digest
      if (typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND')) {
        throw error
      }
      console.error(`[api] ${req.method} ${req.nextUrl.pathname} failed:`, error)
      return fail(ERROR_CODES.INTERNAL_ERROR, 'Something went wrong. Please try again.', 500)
    }
  }
}
