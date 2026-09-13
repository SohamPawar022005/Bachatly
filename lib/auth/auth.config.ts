import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-safe Auth.js configuration.
 *
 * Middleware runs on the edge runtime where node-postgres and bcrypt are not
 * available, so this config contains only session/JWT settings and route
 * protection. The credential check lives in lib/auth/index.ts.
 */
export const authConfig = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role ?? 'USER'
        if (user.name) token.name = user.name
        if (user.email) token.email = user.email
      }
      return token
    },
    session({ session, token }) {
      // Assign only what we have: next-auth's core User fields are non-nullable,
      // so we never write `null` into them.
      if (token.id) session.user.id = token.id
      session.user.role = token.role ?? 'USER'
      if (token.name) session.user.name = token.name
      if (token.email) session.user.email = token.email
      return session
    },
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user)
      const protectedPrefixes = ['/account', '/favorites', '/alerts', '/admin']
      const isProtected = protectedPrefixes.some(
        (prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`),
      )
      if (!isProtected) return true

      if (!isLoggedIn) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('callbackUrl', request.nextUrl.pathname)
        return Response.redirect(url)
      }

      // The admin console is also guarded inside the page, but rejecting here
      // keeps non-admins off the route with a real HTTP redirect instead of a
      // client-side navigation after the shell has streamed.
      const isAdminRoute =
        request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/')
      if (isAdminRoute && auth?.user?.role !== 'ADMIN') {
        const url = request.nextUrl.clone()
        url.pathname = '/account'
        url.search = ''
        return Response.redirect(url)
      }

      return true
    },
  },
} satisfies NextAuthConfig
