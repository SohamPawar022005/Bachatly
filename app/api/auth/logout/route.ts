import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { signOut } from '@/lib/auth'

/** POST /api/auth/logout */
export const POST = withApi(
  async () => {
    await signOut({ redirectTo: '/' })
    return ok({ signedOut: true })
  },
  { auth: 'user' },
)
