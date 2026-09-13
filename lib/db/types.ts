/**
 * The single database abstraction used by every repository.
 *
 * Two adapters implement it (see lib/db/client.ts):
 *  - Prisma Client with the `@prisma/adapter-pg` driver adapter (default in a
 *    standard environment / on Vercel)
 *  - a node-postgres `Pool` (used automatically when a generated Prisma Client
 *    is unavailable, e.g. an offline environment where Prisma engine binaries
 *    cannot be downloaded — see README "Environment notes")
 *
 * Both execute exactly the same SQL text with the same `$1..$n` placeholders,
 * so business logic is identical in both worlds.
 */

export type Row = Record<string, unknown>

export interface DatabaseClient {
  readonly driver: 'prisma' | 'pg'
  /** Run a query, returning all rows. */
  query<T = Row>(sql: string, params?: readonly unknown[]): Promise<T[]>
  /** Run a query, returning the first row or null. */
  queryOne<T = Row>(sql: string, params?: readonly unknown[]): Promise<T | null>
  /** Run a statement, returning the number of affected rows. */
  execute(sql: string, params?: readonly unknown[]): Promise<number>
  /** Run several statements inside one transaction. */
  transaction<T>(work: (tx: DatabaseClient) => Promise<T>): Promise<T>
}

/** Row shapes shared across repositories (snake-free: we alias in SQL). */
export type Money = number

export type Availability = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PREORDER' | 'UNKNOWN'
export type ListingSource = 'DEMO' | 'LIVE_API' | 'AFFILIATE_FEED' | 'MANUAL'
export type ResolutionStatus = 'RESOLVED' | 'PENDING' | 'UNMATCHED'

export interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  sortOrder: number
  parentId: string | null
  createdAt: Date
  productCount?: number
}

export interface ProductRow {
  id: string
  title: string
  slug: string
  brand: string
  description: string | null
  categoryId: string
  imageUrl: string | null
  rating: number
  reviewCount: number
  lowestPrice: number | null
  highestPrice: number | null
  cheapestRetailerId: string | null
  updatedAtPriceAt: Date | null
  createdAt: Date
  updatedAt: Date
  categorySlug?: string | null
  categoryName?: string | null
  cheapestRetailerName?: string | null
}

export interface VariantRow {
  id: string
  productId: string
  title: string
  slug: string
  sku: string | null
  modelNumber: string | null
  gtin: string | null
  color: string | null
  size: string | null
  storage: string | null
  imageUrl: string | null
  specifications: Record<string, unknown> | null
  lowestPrice: number | null
  highestPrice: number | null
  cheapestListingId: string | null
  cheapestRetailerId: string | null
  listingCount: number
  bestDiscountPercent: number
  fastestDeliveryDays: number | null
  rollupsUpdatedAt: Date | null
  createdAt: Date
  updatedAt: Date
  productTitle?: string
  productBrand?: string
  productSlug?: string
  rating?: number
  reviewCount?: number
}

export interface RetailerRow {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  websiteUrl: string
  brandColor: string
  isActive: boolean
  affiliateNetwork: string | null
  affiliateId: string | null
  affiliateUrlTemplate: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ListingRow {
  id: string
  productVariantId: string
  retailerId: string
  retailerProductId: string
  rawTitle: string
  normalizedTitle: string
  productUrl: string
  affiliateUrl: string | null
  availability: Availability
  deliveryText: string | null
  deliveryFee: number
  deliveryDays: number | null
  source: ListingSource
  lastCheckedAt: Date | null
  resolutionStatus: ResolutionStatus
  matchConfidence: number
  createdAt: Date
  updatedAt: Date
}

export interface PriceRow {
  id: string
  listingId: string
  price: number
  mrp: number
  discount: number
  deliveryFee: number
  effectivePrice: number
  currency: string
  inStock: boolean
  checkedAt: Date
}
