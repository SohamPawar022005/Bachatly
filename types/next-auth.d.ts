/**
 * Auth.js (Next Auth v5) types.
 *
 * v5 re-exports its types from @auth/core, so augmentation has to target the
 * @auth/core modules rather than the next-auth aliases.
 */
import '@auth/core/jwt'
import '@auth/core/types'

declare module '@auth/core/types' {
  interface User {
    id: string
    role: 'USER' | 'ADMIN'
  }

  interface Session {
    user: User
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string
    role?: 'USER' | 'ADMIN'
  }
}
