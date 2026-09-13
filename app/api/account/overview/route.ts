import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { requireUser } from '@/lib/auth/guards'
import { countFavorites } from '@/lib/db/repositories/favorite-repository'
import { countAlerts } from '@/lib/db/repositories/alert-repository'
import { countUnreadNotifications } from '@/lib/db/repositories/notification-repository'
import { listRecentSearches } from '@/lib/db/repositories/search-history-repository'

/** GET /api/account/overview — everything the dashboard header needs. */
export const GET = withApi(
  async () => {
    const user = await requireUser()
    const [favorites, alerts, unread, searches] = await Promise.all([
      countFavorites(user.id),
      countAlerts(user.id),
      countUnreadNotifications(user.id),
      listRecentSearches(user.id, 8),
    ])
    return ok({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      savedProducts: favorites,
      activeAlerts: alerts,
      unreadNotifications: unread,
      recentSearches: searches.map((s) => ({ query: s.query, resultCount: s.resultCount, createdAt: new Date(s.createdAt).toISOString() })),
    })
  },
  { auth: 'user' },
)
