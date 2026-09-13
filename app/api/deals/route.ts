import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { getDeals } from '@/services/deal-service'

/** GET /api/deals — best deals, biggest drops and price buckets. */
export const GET = withApi(async () => ok(await getDeals()))
