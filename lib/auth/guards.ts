import { auth } from './index'
import { AppError } from '@/lib/api/errors'
import type { SessionUser } from './index'

/** Returns the signed-in user or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth()
  const user = session?.user as SessionUser | undefined
  if (!user?.id) return null
  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
    role: user.role ?? 'USER',
    image: user.image ?? null,
  }
}

/** Throws UNAUTHENTICATED when there is no session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new AppError('UNAUTHENTICATED', 'Please sign in to continue.', 401)
  return user
}

/** Throws FORBIDDEN unless the signed-in user is an admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'You do not have permission to perform this action.', 403)
  }
  return user
}
