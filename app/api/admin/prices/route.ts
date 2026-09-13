import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { priceHistoryForListing, priceHistoryForVariant } from '@/lib/db/repositories/price-repository'

/** GET /api/admin/prices?listingId=... or ?variantId=...&days=90 */
export const GET = withApi(
  async (req: NextRequest) => {
    const params = req.nextUrl.searchParams
    const days = Number(params.get('days') ?? 90)
    const listingId = params.get('listingId')
    const variantId = params.get('variantId')
    if (listingId) return ok({ items: await priceHistoryForListing(listingId, { days }) })
    if (variantId) return ok({ items: await priceHistoryForVariant(variantId, { days }) })
    return ok({ items: [] })
  },
  { auth: 'admin' },
)
