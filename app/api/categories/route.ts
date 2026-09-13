import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { listCategoriesWithCounts } from '@/lib/db/repositories/category-repository'

/** GET /api/categories */
export const GET = withApi(async () => ok({ items: await listCategoriesWithCounts() }))
