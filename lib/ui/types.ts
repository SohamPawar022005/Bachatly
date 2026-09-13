/**
 * Shared shapes for UI components.
 *
 * Most of these alias the service return types directly (type-only imports are
 * erased at build time, so client bundles never pull in server code). The few
 * interfaces defined here describe the JSON our REST routes compose.
 */
import type { ComparisonResult, PriceClassification } from '@/lib/pricing/types'
import type { FavoriteItem } from '@/services/favorite-service'
import type { AlertView } from '@/services/alert-service'
import type { SearchItem, SearchFacets, SearchResultView } from '@/services/search-service'

export type UiVerdict = PriceClassification['verdict']
export type UiComparison = ComparisonResult
export type UiFavorite = FavoriteItem
export type UiAlert = AlertView
export type UiSearchItem = SearchItem
export type UiFacets = SearchFacets
export type UiSearchResult = SearchResultView

export interface UiNotification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

export interface UiNotificationList {
  items: UiNotification[]
  total: number
  unreadCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface UiSearchHistoryItem {
  query: string
  resultCount: number
  createdAt: string
}

export interface UiAccountOverview {
  user: { id: string; name: string; email: string; role: 'USER' | 'ADMIN' }
  savedProducts: number
  activeAlerts: number
  unreadNotifications: number
  recentSearches: UiSearchHistoryItem[]
}

/* ------------------------------------------------------------------ *
 * /api/products/:id/prices
 * ------------------------------------------------------------------ */

export interface UiOffer {
  listingId: string
  retailer: string
  retailerSlug: string
  brandColor: string | null
  logoUrl: string | null
  price: number
  mrp: number | null
  discount: number
  deliveryFee: number | null
  effectivePrice: number
  availability: string
  deliveryText: string | null
  deliveryDays: number | null
  checkedAt: string | null
  isCheapest: boolean
  extraCostVsCheapest: number
  source: string
  buy: { url: string | null; available: boolean; reason?: string }
  externalLinkRel: string
}

export interface UiPricesResponse {
  variantId: string
  variantSlug: string
  summary: {
    lowestPrice: number | null
    highestPrice: number | null
    averagePrice: number | null
    maximumSavings: number
    savingsPercent: number
    cheapestRetailer: string | null
  }
  offers: UiOffer[]
  excluded: Array<{
    listingId: string
    retailer: string
    reason: string
    availability: string
    checkedAt: string | null
  }>
  isDemoData: boolean
}

/* ------------------------------------------------------------------ *
 * /api/products/:id/history
 * ------------------------------------------------------------------ */

export interface UiHistoryPoint {
  date: string
  price: number
  retailer: string
  retailerSlug: string
}

export interface UiWindowStats {
  lowest: number | null
  highest: number | null
  average: number | null
  sampleSize: number
}

export interface UiHistoryResponse {
  variantId: string
  variantSlug: string
  days: number
  series: Array<{ retailer: string; retailerSlug: string; color: string; points: UiHistoryPoint[] }>
  cheapestSeries: UiHistoryPoint[]
  stats: UiWindowStats
  windows: Record<'7' | '30' | '90', UiWindowStats>
  classification: PriceClassification
  freshness: {
    label: string
    status: 'fresh' | 'stale' | 'unknown' | 'unavailable'
    isStale: boolean
    checkedAt: string | null
  }
  comparison: {
    lowestPrice: number | null
    highestPrice: number | null
    averagePrice: number | null
    maximumSavings: number
    savingsPercent: number
    cheapestRetailer: string | null
  }
  isDemoData: boolean
}
