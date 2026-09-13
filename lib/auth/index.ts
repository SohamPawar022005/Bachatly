import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

import { authConfig } from './auth.config'
import { verifyPassword } from './password'
import { findUserByEmail } from '@/lib/db/repositories/user-repository'
import { loginSchema } from '@/lib/validation/schemas'

/**
 * Auth.js (Next Auth v5) with a credentials provider and JWT sessions.
 *
 * Deliberately small surface: register (POST /api/auth/register), login and
 * logout go through the Auth.js routes; sessions are httpOnly cookies.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const user = await findUserByEmail(parsed.data.email)
        if (!user) {
          // Run a comparison anyway so response timing does not reveal whether
          // the account exists.
          await verifyPassword(parsed.data.password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva')
          return null
        }
        const valid = await verifyPassword(parsed.data.password, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role, image: user.image }
      },
    }),
  ],
})

export type SessionUser = {
  id: string
  email: string | null
  name: string | null
  role: 'USER' | 'ADMIN'
  image?: string | null
}
