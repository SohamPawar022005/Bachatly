import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { searchQuerySchema } from '@/lib/validation/schemas'
import { search } from '@/services/search-service'

/**
 * GET /api/products — browse the catalogue.
 * The same filters/sorting/pagination as search, with an empty query.
 */
export const GET = withApi(async (req: NextRequest) => {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = searchQuerySchema.parse({ sort: 'cheapest', ...params })
  const result = await search(parsed)
  return ok(result)
})
