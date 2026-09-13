import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { searchQuerySchema } from '@/lib/validation/schemas'
import { search } from '@/services/search-service'

/**
 * GET /api/search?q=iPhone+16&sort=cheapest&page=1
 *
 * Full-text + trigram search across products, brands, model numbers and SKUs,
 * with each result carrying its real cheapest offer.
 */
export const GET = withApi(
  async (req: NextRequest, ctx) => {
    const parsed = searchQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()))
    const result = await search(parsed, { userId: ctx.user?.id })
    return ok(result)
  },
)
