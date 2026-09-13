import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { fail, ok } from '@/lib/api/respond'
import { loginSchema } from '@/lib/validation/schemas'
import { signIn } from '@/lib/auth'
import { ERROR_CODES } from '@/lib/api/errors'

/**
 * POST /api/auth/login
 *
 * Thin wrapper over Auth.js credentials sign-in so clients have the REST shape
 * described in the API contract. Returns the session user; the session cookie
 * is set by Auth.js.
 */
export const POST = withApi(
  async (req: NextRequest, _ctx, input) => {
    try {
      await signIn('credentials', {
        email: input.email,
        password: input.password,
        redirectTo: req.nextUrl.searchParams.get('callbackUrl') ?? '/',
      })
    } catch (error) {
      // Auth.js reports bad credentials as a CredentialsSignin error; on success
      // it throws a redirect, which must be allowed to propagate.
      if ((error as { name?: string } | null)?.name === 'CredentialsSignin') {
        return fail(ERROR_CODES.INVALID_CREDENTIALS, 'Incorrect email or password.', 401)
      }
      throw error
    }
    return ok({ authenticated: true })
  },
  { schema: loginSchema, auth: 'public' },
)
