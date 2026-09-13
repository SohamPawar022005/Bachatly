import type { Availability } from '@/lib/db/types'

/** A single retailer's offer for one canonical product variant. */
export interface RetailerOffer {
  listingId: string
  /** The canonical variant this offer was resolved to. */
  productVariantId: string
  retailerId: string
  retailerName: string
  retailerSlug: string
  retailerBrandColor?: string | null
  logoUrl?: string | null
  productUrl: string
  affiliateUrl?: string | null
  /** Selling price in paise. */
  price: number
  mrp: number
  /** mrp - price, never negative, in paise. */
  discount: number
  deliveryFee: number
  /** False when the retailer did not publish a delivery fee — the component is then excluded. */
  deliveryFeeKnown: boolean
  /** Effective price in paise: what the customer actually pays. */
  effectivePrice: number
  availability: Availability
  deliveryText?: string | null
  deliveryDays?: number | null
  inStock: boolean
  checkedAt: Date
  /** Where the data came from: DEMO data is never presented as live. */
  source: 'DEMO' | 'LIVE_API' | 'AFFILIATE_FEED' | 'MANUAL'
  /** Identity-resolution confidence that this listing is the same physical product. */
  matchConfidence?: number
  /** Listings that could not be resolved to a canonical variant never compete on price. */
  resolutionStatus?: 'RESOLVED' | 'PENDING' | 'UNMATCHED'
}

export interface ComparisonResult {
  lowestPrice: number | null
  highestPrice: number | null
  averagePrice: number | null
  maximumSavings: number | null
  savingsPercent: number
  cheapestRetailer: string | null
  cheapestListingId: string | null
  offerCount: number
  /** Offers actually used for comparison (in-stock, priced, resolved). */
  comparableOffers: RetailerOffer[]
  /** Offers excluded from the cheapest-price calculation, with the reason. */
  excludedOffers: Array<{ offer: RetailerOffer; reason: string }>
  /** Highest price minus lowest price as a percentage of the highest price. */
  comparedAt: Date
}

export type PriceVerdict = 'GREAT' | 'GOOD' | 'AVERAGE' | 'HIGH'

export interface PriceClassification {
  verdict: PriceVerdict
  label: string
  /** How the current price relates to the stored average, in percent. */
  vsAveragePercent: number
  current: number
  lowest: number
  highest: number
  average: number
  sampleSize: number
  /** 'low' when there is not enough history to be confident. */
  confidence: 'low' | 'medium' | 'high'
  reason: string
}
