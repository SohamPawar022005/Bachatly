import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { getPricingForVariant } from '@/services/pricing-service'
import { findVariantBySlug, findVariantById } from '@/lib/db/repositories/product-repository'
import { ERROR_CODES, notFound } from '@/lib/api/errors'

/**
 * GET /api/products/:id/history?days=30
 * Price history plus a classification derived from the stored records.
 */
export const GET = withApi(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const daysParam = Number(req.nextUrl.searchParams.get('days') ?? 90)
  const days = Number.isFinite(daysParam) ? Math.min(365, Math.max(7, daysParam)) : 90

  const variant = (await findVariantBySlug(id)) ?? (await findVariantById(id))
  if (!variant) throw notFound('Product variant', ERROR_CODES.VARIANT_NOT_FOUND)

  const pricing = await getPricingForVariant(variant.id, { days })
  const history = pricing.history
  return ok({
    variantId: variant.id,
    variantSlug: variant.slug,
    ...history,
    comparison: {
      lowestPrice: pricing.comparison.lowestPrice,
      highestPrice: pricing.comparison.highestPrice,
      averagePrice: pricing.comparison.averagePrice,
      maximumSavings: pricing.comparison.maximumSavings,
      cheapestRetailer: pricing.comparison.cheapestRetailer,
    },
    isDemoData: pricing.isDemoData,
  })
})
