import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { getSystemHealth } from '@/services/admin-service'

/** GET /api/admin/health */
export const GET = withApi(async () => ok(await getSystemHealth()), { auth: 'admin' })
