import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { adminListReviewQueue } from '@/services/admin-service'

/** GET /api/admin/matches — identity-resolution review queue. */
export const GET = withApi(async () => ok({ items: await adminListReviewQueue(100) }), { auth: 'admin' })
