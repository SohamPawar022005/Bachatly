import { db } from '@/lib/db/client'
import type { Availability } from '@/lib/db/types'

/**
 * Retailer adapter contract.
 *
 * Every retailer integration — a mock backed by seeded demo data today, a real
 * authorized API / affiliate feed tomorrow — implements this interface. Nothing
 * else in the codebase knows which retailer it is talking to.
 *
 * Rules for real implementations:
 *  - use only authorized APIs, affiliate feeds or licensed data providers
 *  - never bypass CAPTCHAs, anti-bot systems or terms of service
 *  - always report `source` honestly so the UI can label data freshness
 */

export interface RetailerPriceResult {
  retailerProductId: string
  /** Paise. */
  price: number
  /** Paise. */
  mrp: number
  currency: string
  availability: Availability
  deliveryText: string | null
  /** Paise, or null when the retailer does not publish a delivery fee. */
  deliveryFee: number | null
  deliveryFeeKnown: boolean
  deliveryDays: number | null
  productUrl: string
  fetchedAt: Date
}

export interface RetailerSearchResult extends RetailerPriceResult {
  rawTitle: string
}

export interface RetailerAdapter {
  readonly slug: string
  readonly name: string
  /** Where this adapter's data comes from — surfaced in the UI. */
  readonly source: 'DEMO' | 'LIVE_API' | 'AFFILIATE_FEED' | 'MANUAL'
  /** False for mock adapters; the UI must then label data as demonstration data. */
  readonly isLive: boolean
  searchProducts(query: string): Promise<RetailerSearchResult[]>
  getProduct(retailerProductId: string): Promise<RetailerPriceResult | null>
  getPrice(retailerProductId: string): Promise<RetailerPriceResult | null>
  getAvailability(retailerProductId: string): Promise<Availability | null>
}

interface DemoListingRow {
  id: string
  retailerProductId: string
  rawTitle: string
  productUrl: string
  availability: Availability
  deliveryText: string | null
  deliveryFee: number
  deliveryDays: number | null
  price: number
  mrp: number
  currency: string
  /** True when this listing's stored prices always include a delivery fee. */
  deliveryFeeKnown: boolean
}

const DEMO_LISTING_SELECT = `
  SELECT pl.id, pl."retailerProductId", pl."rawTitle", pl."productUrl", pl.availability,
         pl."deliveryText", pl."deliveryFee", pl."deliveryDays",
         p.price, p.mrp, p.currency,
         EXISTS (SELECT 1 FROM prices x WHERE x."listingId" = pl.id AND x."deliveryFee" > 0) AS "deliveryFeeKnown"
  FROM product_listings pl
  JOIN retailers r ON r.id = pl."retailerId" AND r.slug = $1
  LEFT JOIN LATERAL (
    SELECT price, mrp, currency FROM prices
    WHERE "listingId" = pl.id ORDER BY "checkedAt" DESC LIMIT 1
  ) p ON true`

export interface DemoAdapterOptions {
  slug: string
  name: string
  /** Applied to refreshed prices so a refresh produces realistic movement. */
  jitterPercent?: number
  /** Delivery-fee reporting quirk for this retailer. */
  deliveryFeePolicy?: 'always-free' | 'published' | 'unknown'
}

/**
 * Mock adapter backed by the seeded demonstration catalogue.
 *
 * It reads the retailer's own stored listings and prices — the same data a real
 * feed would deliver — and is explicitly labelled `isLive = false`.
 */
export function createDemoAdapter(options: DemoAdapterOptions): RetailerAdapter {
  const { slug, name } = options
  const jitterPercent = options.jitterPercent ?? 0

  async function rows(where: { retailerProductId?: string; query?: string }): Promise<DemoListingRow[]> {
    if (where.retailerProductId) {
      return db.query<DemoListingRow>(
        `${DEMO_LISTING_SELECT}
         WHERE pl."retailerProductId" = $2 AND p.price IS NOT NULL`,
        [slug, where.retailerProductId],
      )
    }
    return db.query<DemoListingRow>(
      `${DEMO_LISTING_SELECT}
       WHERE (pl."rawTitle" ILIKE $2 OR pl."normalizedTitle" ILIKE $2) AND p.price IS NOT NULL
       LIMIT 50`,
      [slug, `%${(where.query ?? '').replace(/[%_\\]/g, (m) => `\\${m}`)}%`],
    )
  }

  function toResult(row: DemoListingRow, applyJitter: boolean): RetailerPriceResult | null {
    // Never fabricate a price: if the feed has none, report "unavailable".
    if (row.price === null || row.price === undefined || row.price <= 0) return null
    let price = row.price
    if (applyJitter && jitterPercent > 0) {
      // Deterministic-ish movement so a manual refresh visibly changes prices.
      const factor = 1 + ((Math.random() * 2 - 1) * jitterPercent) / 100
      price = Math.max(1, Math.round((price * factor) / 100) * 100)
    }
    const deliveryFeeKnown =
      options.deliveryFeePolicy === 'always-free'
        ? true
        : options.deliveryFeePolicy === 'unknown'
          ? false
          : Boolean(row.deliveryFeeKnown) || row.deliveryFee > 0
    return {
      retailerProductId: row.retailerProductId,
      price,
      mrp: row.mrp ?? price,
      currency: row.currency ?? 'INR',
      availability: row.availability,
      deliveryText: row.deliveryText,
      deliveryFee: deliveryFeeKnown ? (row.deliveryFee ?? 0) : null,
      deliveryFeeKnown,
      deliveryDays: row.deliveryDays,
      productUrl: row.productUrl,
      fetchedAt: new Date(),
    }
  }

  return {
    slug,
    name,
    source: 'DEMO',
    isLive: false,
    async searchProducts(query) {
      const list = await rows({ query })
      const results: RetailerSearchResult[] = []
      for (const row of list) {
        const result = toResult(row, false)
        if (result) results.push({ ...result, rawTitle: row.rawTitle })
      }
      return results
    },
    async getProduct(retailerProductId) {
      const [row] = await rows({ retailerProductId })
      return row ? toResult(row, false) : null
    },
    async getPrice(retailerProductId) {
      const [row] = await rows({ retailerProductId })
      return row ? toResult(row, true) : null
    },
    async getAvailability(retailerProductId) {
      const [row] = await rows({ retailerProductId })
      return row ? row.availability : null
    },
  }
}
