import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { listActiveRetailers } from '@/lib/db/repositories/retailer-repository'

/** GET /api/retailers — active retailers shown in comparisons and filters. */
export const GET = withApi(async () => ok({ items: await listActiveRetailers() }))
