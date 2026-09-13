import { describe, expect, it } from 'vitest'
import { calculateEffectivePrice } from '@/lib/pricing/effective-price'
import { compareOffers, savingsAgainstCheapest } from '@/lib/pricing/compare'
import { classifyPrice } from '@/lib/pricing/classify'
import type { RetailerOffer } from '@/lib/pricing/types'

/** All amounts in paise: 6649900 = ₹66,499. */
function offer(overrides: Partial<RetailerOffer> & { retailerName: string; effectivePrice: number }): RetailerOffer {
  return {
    listingId: `listing-${overrides.retailerName.toLowerCase()}`,
    productVariantId: 'variant-1',
    retailerId: `ret-${overrides.retailerName.toLowerCase()}`,
    retailerSlug: overrides.retailerName.toLowerCase(),
    productUrl: `https://example.com/${overrides.retailerName.toLowerCase()}`,
    price: overrides.effectivePrice,
    mrp: overrides.effectivePrice,
    discount: 0,
    deliveryFee: 0,
    deliveryFeeKnown: true,
    availability: 'IN_STOCK',
    inStock: true,
    checkedAt: new Date('2026-01-01T00:00:00Z'),
    source: 'DEMO',
    ...overrides,
  }
}

describe('effective price', () => {
  it('adds a known delivery fee', () => {
    const result = calculateEffectivePrice({ price: 6_499_900, mrp: 7_199_900, deliveryFee: 9_900 })
    expect(result.effectivePrice).toBe(6_509_800)
    expect(result.discount).toBe(700_000)
    expect(result.discountPercent).toBe(9.7)
  })

  it('does not invent a delivery fee when the retailer did not publish one', () => {
    const result = calculateEffectivePrice({ price: 6_499_900, deliveryFee: null, deliveryFeeKnown: false })
    expect(result.effectivePrice).toBe(6_499_900)
    expect(result.deliveryFeeIncluded).toBe(false)
    expect(result.freeDelivery).toBe(false)
  })

  it('flags free delivery when a zero fee was published', () => {
    const result = calculateEffectivePrice({ price: 1_00_000, deliveryFee: 0, deliveryFeeKnown: true })
    expect(result.freeDelivery).toBe(true)
    expect(result.effectivePrice).toBe(1_00_000)
  })

  it('never double counts the retailer discount already reflected in price', () => {
    // mrp 70000, price 60000 -> discount 10000 is already in `price`.
    const result = calculateEffectivePrice({ price: 6_000_000, mrp: 7_000_000 })
    expect(result.effectivePrice).toBe(6_000_000)
    expect(result.discount).toBe(1_000_000)
  })

  it('applies a coupon only when the minimum spend is met', () => {
    const belowMin = calculateEffectivePrice({ price: 4_000_000, coupon: { value: 50_000, minSpend: 5_000_000 } })
    expect(belowMin.couponApplied).toBe(false)
    expect(belowMin.effectivePrice).toBe(4_000_000)

    const aboveMin = calculateEffectivePrice({ price: 6_000_000, coupon: { value: 50_000, minSpend: 5_000_000 } })
    expect(aboveMin.couponApplied).toBe(true)
    expect(aboveMin.effectivePrice).toBe(5_950_000)
  })

  it('treats a missing or lower MRP as no discount', () => {
    expect(calculateEffectivePrice({ price: 5_000_000, mrp: 4_000_000 }).discount).toBe(0)
    expect(calculateEffectivePrice({ price: 5_000_000, mrp: null }).discount).toBe(0)
  })

  it('never returns a negative effective price', () => {
    const result = calculateEffectivePrice({ price: 1_000, coupon: { value: 9_999_999 } })
    expect(result.effectivePrice).toBe(0)
  })
})

describe('price comparison engine', () => {
  it('derives the cheapest retailer from stored offers (never hardcoded)', () => {
    const offers = [
      offer({ retailerName: 'Amazon', effectivePrice: 6_649_900 }),
      offer({ retailerName: 'Flipkart', effectivePrice: 6_499_900 }),
      offer({ retailerName: 'Croma', effectivePrice: 6_799_000 }),
    ]
    const result = compareOffers(offers)
    expect(result.cheapestRetailer).toBe('Flipkart')
    expect(result.lowestPrice).toBe(6_499_900)
    expect(result.highestPrice).toBe(6_799_000)
    expect(result.maximumSavings).toBe(299_100) // ₹2,991
    expect(result.averagePrice).toBe(6_649_600)
  })

  it('switches the cheapest retailer when prices change', () => {
    const offers = [
      offer({ retailerName: 'Amazon', effectivePrice: 6_000_000 }),
      offer({ retailerName: 'Flipkart', effectivePrice: 6_100_000 }),
      offer({ retailerName: 'Croma', effectivePrice: 6_200_000 }),
    ]
    expect(compareOffers(offers).cheapestRetailer).toBe('Amazon')
  })

  it('uses effective price (incl. delivery) rather than list price', () => {
    const offers = [
      // Cheaper sticker price but paid delivery -> actually more expensive.
      offer({ retailerName: 'Amazon', effectivePrice: 6_099_000, price: 6_000_000, deliveryFee: 99_000 }),
      offer({ retailerName: 'Flipkart', effectivePrice: 6_050_000, price: 6_050_000, deliveryFee: 0 }),
    ]
    expect(compareOffers(offers).cheapestRetailer).toBe('Flipkart')
  })

  it('excludes out-of-stock retailers from the cheapest calculation', () => {
    const offers = [
      offer({ retailerName: 'Amazon', effectivePrice: 5_000_000, availability: 'OUT_OF_STOCK' }),
      offer({ retailerName: 'Flipkart', effectivePrice: 6_000_000 }),
    ]
    const result = compareOffers(offers)
    expect(result.cheapestRetailer).toBe('Flipkart')
    expect(result.excludedOffers[0]?.reason).toBe('Currently unavailable')
  })

  it('excludes unresolved listings so prices are never compared across products', () => {
    const offers = [
      offer({ retailerName: 'Amazon', effectivePrice: 1_000_000, resolutionStatus: 'UNMATCHED' }),
      offer({ retailerName: 'Flipkart', effectivePrice: 6_000_000 }),
    ]
    const result = compareOffers(offers)
    expect(result.cheapestRetailer).toBe('Flipkart')
    expect(result.comparableOffers).toHaveLength(1)
  })

  it('excludes listings still pending identity verification', () => {
    const offers = [
      offer({ retailerName: 'Meesho', effectivePrice: 43_900, resolutionStatus: 'PENDING' }),
      offer({ retailerName: 'Flipkart', effectivePrice: 6_499_900 }),
    ]
    const result = compareOffers(offers)
    expect(result.cheapestRetailer).toBe('Flipkart')
    expect(result.lowestPrice).toBe(6_499_900)
    expect(result.excludedOffers[0]?.reason).toBe('Price pending verification')
  })

  it('handles a single retailer (zero savings) and no offers', () => {
    const single = compareOffers([offer({ retailerName: 'Amazon', effectivePrice: 6_000_000 })])
    expect(single.cheapestRetailer).toBe('Amazon')
    expect(single.maximumSavings).toBe(0)

    const none = compareOffers([])
    expect(none.cheapestRetailer).toBeNull()
    expect(none.lowestPrice).toBeNull()
  })

  it('breaks price ties deterministically on free delivery then name', () => {
    const offers = [
      offer({ retailerName: 'Zeta', effectivePrice: 6_000_000, deliveryFee: 0 }),
      offer({ retailerName: 'Alpha', effectivePrice: 6_000_000, deliveryFee: 0 }),
    ]
    expect(compareOffers(offers).cheapestRetailer).toBe('Alpha')
  })

  it('computes savings of an offer against the cheapest', () => {
    const offers = [
      offer({ retailerName: 'Amazon', effectivePrice: 6_649_900 }),
      offer({ retailerName: 'Flipkart', effectivePrice: 6_499_900 }),
    ]
    const comparison = compareOffers(offers)
    expect(savingsAgainstCheapest(offers[0], comparison)).toBe(150_000)
  })
})

describe('price classification', () => {
  const history = Array.from({ length: 30 }, (_, i) => 6_500_000 + (i % 5) * 50_000)

  it('flags a great price near the recorded low and below average', () => {
    const result = classifyPrice({ current: 6_500_000, history })
    expect(result.verdict).toBe('GREAT')
    expect(result.vsAveragePercent).toBeLessThan(0)
    expect(result.confidence).toBe('high')
  })

  it('flags a high price near the recorded high and above average', () => {
    const result = classifyPrice({ current: 6_700_000, history })
    expect(result.verdict).toBe('HIGH')
  })

  it('flags a good price in the lower part of the range', () => {
    const result = classifyPrice({ current: 6_550_000, history })
    expect(result.verdict).toBe('GOOD')
  })

  it('flags an average price in the middle', () => {
    const result = classifyPrice({ current: 6_600_000, history })
    expect(['AVERAGE', 'GOOD']).toContain(result.verdict)
  })

  it('reports low confidence and AVERAGE when there is no history', () => {
    const result = classifyPrice({ current: 6_600_000, history: [] })
    expect(result.verdict).toBe('AVERAGE')
    expect(result.confidence).toBe('low')
    expect(result.sampleSize).toBe(0)
  })

  it('computes the statistics from the stored records', () => {
    const result = classifyPrice({ current: 6_600_000, history: [6_000_000, 6_500_000, 7_000_000] })
    expect(result.lowest).toBe(6_000_000)
    expect(result.highest).toBe(7_000_000)
    expect(result.average).toBe(6_500_000)
    expect(result.sampleSize).toBe(3)
  })
})
