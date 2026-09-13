import NextAuth from 'next-auth'

import { authConfig } from '@/lib/auth/auth.config'

/**
 * Route protection only — no database access, so it stays edge-safe.
 * API routes enforce their own authentication server-side.
 */
export default NextAuth(authConfig).auth

export const config = {
  matcher: ['/account/:path*', '/favorites/:path*', '/alerts/:path*', '/admin/:path*'],
}
