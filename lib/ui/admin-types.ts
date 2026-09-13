/** Row shapes returned by the admin endpoints (JSON, so dates are strings). */

export interface AdminProductRow {
  id: string
  title: string
  slug: string
  brand: string
  description: string | null
  categoryId: string | null
  categoryName: string | null
  imageUrl: string | null
  rating: number
  reviewCount: number
  lowestPrice: number | null
  highestPrice: number | null
  updatedAtPriceAt: string | null
  variantCount: number
  listingCount: number
}

export interface AdminProductList {
  items: AdminProductRow[]
  total: number
  page: number
  pageSize: number
}

export interface AdminRetailerRow {
  id: string
  name: string
  slug: string
  websiteUrl: string
  logoUrl: string | null
  brandColor: string
  isActive: boolean
  affiliateNetwork: string | null
  affiliateId: string | null
}

export interface AdminListingRow {
  id: string
  retailerId: string
  retailerName: string
  productVariantId: string
  variantTitle: string
  productTitle: string
  variantSlug: string
  retailerProductId: string
  url: string | null
  resolutionStatus: 'RESOLVED' | 'PENDING' | 'UNMATCHED'
  matchConfidence: number
  availability: string
  lastCheckedAt: string | null
  latestPrice: number | null
  latestEffectivePrice: number | null
}

export interface AdminUserRow {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  createdAt: string
  favoriteCount: number
  alertCount: number
}

export interface AdminReviewItem {
  listingId: string
  rawTitle: string
  normalizedTitle: string
  score: number
  retailerName: string
  retailerSlug: string
  productTitle: string
  variantTitle: string
  variantSlug: string
  variantId: string
}

export interface AdminJobRun {
  id: string
  status: string
  triggeredBy: string | null
  listingsChecked: number
  priceRecordsCreated: number
  alertsTriggered: number
  startedAt: string
  finishedAt: string | null
}

export interface AdminStats {
  totalUsers: number
  totalProducts: number
  totalVariants: number
  totalRetailers: number
  activeRetailers: number
  totalListings: number
  totalPriceRecords: number
  activeAlerts: number
  totalFavorites: number
  productsUpdatedToday: number
  listingsCheckedToday: number
  pendingMatches: number
  unmatchedListings: number
  notificationsSent: number
  lastPriceUpdateRun: AdminJobRun | null
  adapters: Array<{ slug: string; name: string; source: string; live: boolean }>
  services: Array<{ name: string; configured: boolean; detail?: string }>
  recentRuns: AdminJobRun[]
}

export interface AdminHealth {
  database: 'ok' | 'error'
  error: string | null
  latencyMs: number
  adapters: Array<{ slug: string; name: string; source: string; live: boolean }>
  services: Array<{ name: string; configured: boolean; detail?: string }>
  queue: string
}

export interface AdminPriceUpdateResult {
  listingsChecked: number
  priceRecordsCreated: number
  variantsRefreshed: number
  productsRefreshed: number
  alertsTriggered: number
  durationMs: number
  skipped?: number
}

export interface AdminPriceHistoryRow {
  id: string
  listingId: string
  price: number
  mrp: number | null
  deliveryFee: number | null
  discount: number | null
  couponValue: number | null
  effectivePrice: number
  availability: string | null
  checkedAt: string
  source: string
}
