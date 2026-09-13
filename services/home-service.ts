import { db } from '@/lib/db/client'
import { listCategoriesWithCounts } from '@/lib/db/repositories/category-repository'
import { listActiveRetailers } from '@/lib/db/repositories/retailer-repository'
import { getDeals } from '@/services/deal-service'
import { enrichSearchRows } from '@/services/search-service'
import { searchProducts } from '@/lib/db/repositories/product-repository'

/**
 * Homepage data. Every number here is counted from the live database at request
 * time — nothing on the homepage is hardcoded.
 */
export interface HomeStats {
  products: number
  variants: number
  listings: number
  priceRecords: number
  retailers: number
  categories: number
  /** Sum of (highest − lowest) across variants that have a comparable range. */
  totalSavingsPotential: number
  variantsWithSavings: number
}

export async function getHomeStats(): Promise<HomeStats> {
  const [row] = await db.query<{
    products: number
    variants: number
    listings: number
    priceRecords: number
    retailers: number
    categories: number
    totalSavingsPotential: number
    variantsWithSavings: number
  }>(
    `SELECT
       (SELECT count(*)::int FROM products)                        AS products,
       (SELECT count(*)::int FROM product_variants)                AS variants,
       (SELECT count(*)::int FROM product_listings)                AS listings,
       (SELECT count(*)::int FROM prices)                          AS "priceRecords",
       (SELECT count(*)::int FROM retailers WHERE "isActive")      AS retailers,
       (SELECT count(*)::int FROM categories)                      AS categories,
       COALESCE((SELECT sum("highestPrice" - "lowestPrice") FROM product_variants
                  WHERE "lowestPrice" IS NOT NULL AND "highestPrice" IS NOT NULL
                    AND "highestPrice" > "lowestPrice"), 0)::bigint AS "totalSavingsPotential",
       (SELECT count(*)::int FROM product_variants
          WHERE "lowestPrice" IS NOT NULL AND "highestPrice" > "lowestPrice") AS "variantsWithSavings"`,
  )
  return {
    products: row.products,
    variants: row.variants,
    listings: row.listings,
    priceRecords: row.priceRecords,
    retailers: row.retailers,
    categories: row.categories,
    totalSavingsPotential: Number(row.totalSavingsPotential),
    variantsWithSavings: row.variantsWithSavings,
  }
}

export interface HomePageData {
  stats: HomeStats
  categories: Awaited<ReturnType<typeof listCategoriesWithCounts>>
  retailers: Awaited<ReturnType<typeof listActiveRetailers>>
  bestDeals: Awaited<ReturnType<typeof getDeals>>['bestDeals']
  biggestDrops: Awaited<ReturnType<typeof getDeals>>['biggestDrops']
  popular: Awaited<ReturnType<typeof enrichSearchRows>>
  popularSearches: Array<{ query: string; searches: number }>
}

export async function getHomePage(): Promise<HomePageData> {
  const [stats, categories, retailers, deals, popularRows, popularSearches] = await Promise.all([
    getHomeStats(),
    listCategoriesWithCounts(),
    listActiveRetailers(),
    getDeals(),
    searchProducts({ sort: 'rating', page: 1, pageSize: 8 }).then((result) => enrichSearchRows(result.items)),
    db
      .query<{ query: string; searches: number }>(
        `SELECT query, count(*)::int AS searches
           FROM search_history
          GROUP BY query
          ORDER BY searches DESC, query ASC
          LIMIT 8`,
      )
      .then((rows) => rows.map((row) => ({ query: row.query, searches: row.searches }))),
  ])

  return {
    stats,
    categories,
    retailers,
    bestDeals: deals.bestDeals,
    biggestDrops: deals.biggestDrops,
    popular: popularRows,
    popularSearches,
  }
}
