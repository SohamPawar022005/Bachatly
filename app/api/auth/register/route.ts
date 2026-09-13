import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok, fail } from '@/lib/api/respond'
import { registerSchema } from '@/lib/validation/schemas'
import { createUser, findUserByEmail } from '@/lib/db/repositories/user-repository'
import { hashPassword } from '@/lib/auth/password'
import { ERROR_CODES } from '@/lib/api/errors'

/**
 * POST /api/auth/register
 *
 * Creates an account with a bcrypt-hashed password. Sign-in itself is handled
 * by Auth.js (POST /api/auth/callback/credentials) so sessions stay consistent.
 */
export const POST = withApi(
  async (_req: NextRequest, _ctx, input) => {
    const existing = await findUserByEmail(input.email)
    if (existing) {
      return fail(ERROR_CODES.DUPLICATE_EMAIL, 'An account with this email already exists.', 409)
    }
    const passwordHash = await hashPassword(input.password)
    const user = await createUser({ name: input.name, email: input.email, passwordHash, role: 'USER' })
    return ok(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      { status: 201 },
    )
  },
  { schema: registerSchema, auth: 'public' },
)
