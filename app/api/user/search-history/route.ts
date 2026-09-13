import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { clearSearchHistory, listRecentSearches } from '@/lib/db/repositories/search-history-repository'
import { requireUser } from '@/lib/auth/guards'

/** GET /api/user/search-history */
export const GET = withApi(
  async () => {
    const user = await requireUser()
    return ok({ items: await listRecentSearches(user.id, 20) })
  },
  { auth: 'user' },
)

/** DELETE /api/user/search-history */
export const DELETE = withApi(
  async () => {
    const user = await requireUser()
    const removed = await clearSearchHistory(user.id)
    return ok({ removed })
  },
  { auth: 'user' },
)
