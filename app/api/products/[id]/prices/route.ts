import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { getPricingForVariant } from '@/services/pricing-service'
import { findVariantBySlug, findVariantById } from '@/lib/db/repositories/product-repository'
import { ERROR_CODES, notFound } from '@/lib/api/errors'
import { buildBuyLink, EXTERNAL_LINK_REL } from '@/services/affiliate-service'
import { savingsAgainstCheapest } from '@/lib/pricing/compare'

/**
 * GET /api/products/:id/prices — the retailer comparison for one variant.
 * The cheapest retailer is computed here, from stored prices, on every call.
 */
export const GET = withApi(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const variant = (await findVariantBySlug(id)) ?? (await findVariantById(id))
  if (!variant) throw notFound('Product variant', ERROR_CODES.VARIANT_NOT_FOUND)

  const pricing = await getPricingForVariant(variant.id)
  const comparison = pricing.comparison

  return ok({
    variantId: variant.id,
    variantSlug: variant.slug,
    summary: {
      lowestPrice: comparison.lowestPrice,
      highestPrice: comparison.highestPrice,
      averagePrice: comparison.averagePrice,
      maximumSavings: comparison.maximumSavings,
      savingsPercent: comparison.savingsPercent,
      cheapestRetailer: comparison.cheapestRetailer,
    },
    offers: comparison.comparableOffers.map((offer) => ({
      listingId: offer.listingId,
      retailer: offer.retailerName,
      retailerSlug: offer.retailerSlug,
      brandColor: offer.retailerBrandColor,
      logoUrl: offer.logoUrl,
      price: offer.price,
      mrp: offer.mrp,
      discount: offer.discount,
      deliveryFee: offer.deliveryFee,
      effectivePrice: offer.effectivePrice,
      availability: offer.availability,
      deliveryText: offer.deliveryText,
      deliveryDays: offer.deliveryDays,
      checkedAt: offer.checkedAt,
      isCheapest: offer.listingId === comparison.cheapestListingId,
      extraCostVsCheapest: savingsAgainstCheapest(offer, comparison),
      source: offer.source,
      buy: buildBuyLink(offer),
      externalLinkRel: EXTERNAL_LINK_REL,
    })),
    excluded: comparison.excludedOffers.map(({ offer, reason }) => ({
      listingId: offer.listingId,
      retailer: offer.retailerName,
      reason,
      availability: offer.availability,
      checkedAt: offer.checkedAt,
    })),
    isDemoData: pricing.isDemoData,
  })
})
