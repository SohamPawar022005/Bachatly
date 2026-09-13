import { listBestDeals, listBiggestPriceDrops, listUnderPrice, type DealRow } from '@/lib/db/repositories/product-repository'
import { rupeesToPaise } from '@/lib/utils/money'

/** Deal feeds. Every discount and drop is computed from stored MRP/price rows. */

export interface DealItem {
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
  lowestPrice: number | null
  highestPrice: number | null
  discountPercent: number
  savings: number | null
  listingCount: number
  cheapestRetailerName: string | null
  cheapestRetailerSlug: string | null
  cheapestRetailerColor: string | null
  dropAmount: number | null
  dropPercent: number | null
  checkedAt: string | null
}

function mapDeal(row: DealRow): DealItem {
  const savings = row.lowestPrice !== null && row.highestPrice !== null ? Math.max(0, row.highestPrice - row.lowestPrice) : null
  return {
    variantId: row.variantId,
    variantSlug: row.variantSlug,
    variantTitle: row.variantTitle,
    title: row.productTitle,
    slug: row.productSlug,
    brand: row.brand,
    imageUrl: row.imageUrl,
    rating: row.rating,
    reviewCount: row.reviewCount,
    categorySlug: row.categorySlug,
    categoryName: row.categoryName,
    lowestPrice: row.lowestPrice,
    highestPrice: row.highestPrice,
    discountPercent: row.bestDiscountPercent,
    savings,
    listingCount: row.listingCount,
    cheapestRetailerName: row.cheapestRetailerName,
    cheapestRetailerSlug: row.cheapestRetailerSlug,
    cheapestRetailerColor: row.cheapestRetailerColor,
    dropAmount: row.dropAmount ?? null,
    dropPercent: row.dropPercent === null || row.dropPercent === undefined ? null : Number(row.dropPercent),
    checkedAt: row.checkedAt ? new Date(row.checkedAt).toISOString() : null,
  }
}

export interface DealsPage {
  bestDeals: DealItem[]
  biggestDrops: DealItem[]
  under1000: DealItem[]
  under5000: DealItem[]
  under10000: DealItem[]
}

export async function getDeals(): Promise<DealsPage> {
  const [bestDeals, biggestDrops, under1000, under5000, under10000] = await Promise.all([
    listBestDeals(12),
    listBiggestPriceDrops(12),
    listUnderPrice(rupeesToPaise(1000), 12),
    listUnderPrice(rupeesToPaise(5000), 12),
    listUnderPrice(rupeesToPaise(10000), 12),
  ])
  return {
    bestDeals: bestDeals.map(mapDeal),
    biggestDrops: biggestDrops.map(mapDeal),
    under1000: under1000.map(mapDeal),
    under5000: under5000.map(mapDeal),
    under10000: under10000.map(mapDeal),
  }
}
