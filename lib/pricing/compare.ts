import type { ComparisonResult, RetailerOffer } from './types'

/**
 * The comparison engine.
 *
 * The cheapest retailer is ALWAYS derived from the stored offers at call time.
 * Nothing is hardcoded: if a different retailer becomes cheaper, this function
 * returns that retailer.
 */

/** Offers in these states take part in the cheapest-price calculation. */
const COMPARABLE_AVAILABILITY = new Set(['IN_STOCK', 'LOW_STOCK'])

export function isFreeDelivery(offer: RetailerOffer): boolean {
  return offer.deliveryFee === 0
}

function isPriced(offer: RetailerOffer): boolean {
  return Number.isFinite(offer.effectivePrice) && offer.effectivePrice > 0
}

export function compareOffers(offers: readonly RetailerOffer[]): ComparisonResult {
  const comparable: RetailerOffer[] = []
  const excluded: Array<{ offer: RetailerOffer; reason: string }> = []

  for (const offer of offers) {
    // A listing is only comparable once identity resolution has confirmed it is
    // the same physical product. Pending / unmatched listings are surfaced with
    // a reason instead of silently corrupting the comparison.
    if (offer.resolutionStatus === 'UNMATCHED') {
      excluded.push({ offer, reason: 'Listing could not be matched to this product' })
      continue
    }
    if (offer.resolutionStatus === 'PENDING') {
      excluded.push({ offer, reason: 'Price pending verification' })
      continue
    }
    if (!isPriced(offer)) {
      excluded.push({ offer, reason: 'Price temporarily unavailable' })
      continue
    }
    if (offer.availability === 'OUT_OF_STOCK' || !offer.inStock) {
      excluded.push({ offer, reason: 'Currently unavailable' })
      continue
    }
    if (!COMPARABLE_AVAILABILITY.has(offer.availability)) {
      excluded.push({ offer, reason: 'Not available for purchase yet' })
      continue
    }
    comparable.push(offer)
  }

  if (comparable.length === 0) {
    return {
      lowestPrice: null,
      highestPrice: null,
      averagePrice: null,
      maximumSavings: null,
      savingsPercent: 0,
      cheapestRetailer: null,
      cheapestListingId: null,
      offerCount: offers.length,
      comparableOffers: [],
      excludedOffers: excluded,
      comparedAt: new Date(),
    }
  }

  // Deterministic ordering: cheapest effective price first, then cheapest list
  // price, then free delivery, then retailer name. This keeps the "cheapest"
  // pick stable and testable when two retailers tie.
  const sorted = [...comparable].sort((a, b) => {
    if (a.effectivePrice !== b.effectivePrice) return a.effectivePrice - b.effectivePrice
    if (a.price !== b.price) return a.price - b.price
    const aFree = isFreeDelivery(a) ? 0 : 1
    const bFree = isFreeDelivery(b) ? 0 : 1
    if (aFree !== bFree) return aFree - bFree
    return a.retailerName.localeCompare(b.retailerName)
  })

  const cheapest = sorted[0]
  const lowestPrice = cheapest.effectivePrice
  const highestPrice = Math.max(...comparable.map((o) => o.effectivePrice))
  const sum = comparable.reduce((acc, o) => acc + o.effectivePrice, 0)
  const averagePrice = Math.round(sum / comparable.length)
  const maximumSavings = Math.max(0, highestPrice - lowestPrice)
  const savingsPercent = highestPrice > 0 ? Math.round((maximumSavings / highestPrice) * 1000) / 10 : 0

  return {
    lowestPrice,
    highestPrice,
    averagePrice,
    maximumSavings,
    savingsPercent,
    cheapestRetailer: cheapest.retailerName,
    cheapestListingId: cheapest.listingId,
    offerCount: offers.length,
    comparableOffers: sorted,
    excludedOffers: excluded,
    comparedAt: new Date(),
  }
}

/** How much more this offer costs than the cheapest one. */
export function savingsAgainstCheapest(offer: RetailerOffer, comparison: ComparisonResult): number {
  if (comparison.lowestPrice === null) return 0
  return Math.max(0, offer.effectivePrice - comparison.lowestPrice)
}

/** Highest price a buyer would pay if they ignored the comparison. */
export function savingsVersusMostExpensive(comparison: ComparisonResult): number {
  return comparison.maximumSavings ?? 0
}
