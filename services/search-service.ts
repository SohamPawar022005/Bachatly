import { listOffersForVariants, searchProducts, listBrands } from '@/lib/db/repositories/product-repository'
import { listCategories } from '@/lib/db/repositories/category-repository'
import { listActiveRetailers } from '@/lib/db/repositories/retailer-repository'
import { recordSearch } from '@/lib/db/repositories/search-history-repository'
import { compareOffers } from '@/lib/pricing/compare'
import { toTsQuery } from '@/lib/search/normalize'
import type { ComparisonResult } from '@/lib/pricing/types'
import type { SearchQuery } from '@/lib/validation/schemas'

/**
 * Search service.
 *
 * Normalisation, full-text + trigram ranking and pagination live in the
 * repository; this service enriches the page of results with real offers so the
 * UI can show "₹64,999 onwards / lowest price at Flipkart" without N+1 queries.
 */

export interface SearchItem {
  variantId: string
  variantSlug: string
  variantTitle: string
  title: string
  slug: string
  brand: string
  imageUrl: string | null
  rating: number
  reviewCount: number
  categorySlug: string | null
  categoryName: string | null
  cheapestRetailerName: string | null
  cheapestRetailerSlug: string | null
  cheapestRetailerColor: string | null
  storage: string | null
  color: string | null
  size: string | null
  bestDiscountPercent: number
  listingCount: number
  comparison: ComparisonResult
}

export interface SearchFacets {
  categories: Array<{ name: string; slug: string }>
  brands: string[]
  retailers: Array<{ name: string; slug: string; brandColor: string }>
  priceBuckets: Array<{ label: string; min?: number; max?: number }>
}

export interface SearchResultView {
  query: string
  items: SearchItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sort: string
  tookMs: number
  strategy: 'fulltext' | 'trigram' | 'browse'
  facets: SearchFacets
}

export const PRICE_BUCKETS = [
  { label: 'Under ₹1,000', max: 100_000 },
  { label: 'Under ₹5,000', max: 500_000 },
  { label: '₹5,000 - ₹15,000', min: 500_000, max: 1_500_000 },
  { label: '₹15,000 - ₹50,000', min: 1_500_000, max: 5_000_000 },
  { label: 'Above ₹50,000', min: 5_000_000 },
]


type SearchRow = Awaited<ReturnType<typeof searchProducts>>['items'][number]

/**
 * Attaches real offers (one query for the whole page) and runs the comparison
 * engine per variant. Used by search, category and deal views alike.
 */
export async function enrichSearchRows(rows: SearchRow[]): Promise<SearchItem[]> {
  if (rows.length === 0) return []
  const variantIds = rows.map((i) => i.variant.id)
  const offers = await listOffersForVariants(variantIds)
  const offersByVariant = new Map<string, typeof offers>()
  for (const offer of offers) {
    const list = offersByVariant.get(offer.productVariantId)
    if (list) list.push(offer)
    else offersByVariant.set(offer.productVariantId, [offer])
  }

  return rows.map((row) => ({
    variantId: row.variant.id,
    variantSlug: row.variant.slug,
    variantTitle: row.variant.title,
    title: row.productTitle,
    slug: row.productSlug,
    brand: row.productBrand,
    imageUrl: row.variant.imageUrl ?? row.productImageUrl,
    rating: row.rating,
    reviewCount: row.reviewCount,
    categorySlug: row.categorySlug,
    categoryName: row.categoryName,
    cheapestRetailerName: row.cheapestRetailerName,
    cheapestRetailerSlug: row.cheapestRetailerSlug,
    cheapestRetailerColor: row.cheapestRetailerColor,
    storage: row.variant.storage,
    color: row.variant.color,
    size: row.variant.size,
    bestDiscountPercent: row.variant.bestDiscountPercent,
    listingCount: row.variant.listingCount,
    comparison: compareOffers(offersByVariant.get(row.variant.id) ?? []),
  }))
}

export async function search(params: SearchQuery, options: { userId?: string } = {}): Promise<SearchResultView> {
  const tsQuery = toTsQuery(params.q)
  const result = await searchProducts(
    {
      query: params.q,
      categorySlug: params.category,
      brands: params.brand,
      retailerSlugs: params.retailer,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      minRating: params.minRating,
      minDiscount: params.minDiscount,
      freeDelivery: params.freeDelivery,
      inStockOnly: params.inStockOnly,
      sort: params.sort,
      page: params.page,
      pageSize: params.pageSize,
    },
    { tsQuery },
  )

  const items = await enrichSearchRows(result.items)

  if (options.userId && params.q.trim()) {
    // Fire and forget — search history must never delay a search response.
    void recordSearch(options.userId, params.q, result.total).catch(() => undefined)
  }

  const [categories, brands, retailers] = await Promise.all([
    listCategories(),
    listBrands(params.category),
    listActiveRetailers(),
  ])

  return {
    query: params.q,
    items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    sort: result.sort,
    tookMs: result.tookMs,
    strategy: result.strategy,
    facets: {
      categories: categories
        .filter((c) => !c.parentId)
        .map((c) => ({ name: c.name, slug: c.slug })),
      brands,
      retailers: retailers.map((r) => ({ name: r.name, slug: r.slug, brandColor: r.brandColor })),
      priceBuckets: PRICE_BUCKETS,
    },
  }
}
