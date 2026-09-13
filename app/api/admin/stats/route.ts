import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { getAdminStats } from '@/services/admin-service'

/** GET /api/admin/stats */
export const GET = withApi(async () => ok(await getAdminStats()), { auth: 'admin' })
