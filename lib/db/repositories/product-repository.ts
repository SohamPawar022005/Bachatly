import { db } from '@/lib/db/client'
import type { DatabaseClient, ProductRow, VariantRow } from '@/lib/db/types'
import { andClauses, placeholders, resolvePagination, resolveSort, withClient } from '@/lib/db/query-helpers'
import { escapeLike } from '@/lib/search/normalize'
import { OFFER_FROM, OFFER_SELECT, mapOfferRow, type OfferRow } from './offer-queries'
import type { RetailerOffer } from '@/lib/pricing/types'
import { cuid } from '@/lib/utils/id'

export type SortKey = 'relevance' | 'cheapest' | 'price_desc' | 'discount' | 'rating' | 'delivery' | 'newest'

export interface SearchFilters {
  query?: string
  categorySlug?: string
  /** Multiple slugs (a category plus its subcategories). */
  categorySlugs?: string[]
  brands?: string[]
  retailerSlugs?: string[]
  /** Paise. */
  minPrice?: number
  /** Paise. */
  maxPrice?: number
  minRating?: number
  minDiscount?: number
  freeDelivery?: boolean
  inStockOnly?: boolean
  sort?: string
  page?: number
  pageSize?: number
}

export interface SearchResultItem {
  variant: VariantRow
  productId: string
  productTitle: string
  productSlug: string
  productBrand: string
  productImageUrl: string | null
  rating: number
  reviewCount: number
  categorySlug: string | null
  categoryName: string | null
  cheapestRetailerName: string | null
  cheapestRetailerSlug: string | null
  cheapestRetailerColor: string | null
  relevance: number
  ftsRank: number
  trgmRank: number
}

export interface SearchResult {
  items: SearchResultItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sort: SortKey
  tookMs: number
  strategy: 'fulltext' | 'trigram' | 'browse'
}

const VARIANT_SELECT = `
  v.id, v."productId", v.title, v.slug, v.sku, v."modelNumber", v.gtin, v.color, v.size, v.storage,
  v."imageUrl", v.specifications, v."lowestPrice", v."highestPrice", v."cheapestListingId",
  v."cheapestRetailerId", v."listingCount", v."bestDiscountPercent", v."fastestDeliveryDays",
  v."rollupsUpdatedAt", v."createdAt", v."updatedAt"
`

const PRODUCT_JOIN_SELECT = `
  p.id AS "productId", p.title AS "productTitle", p.slug AS "productSlug", p.brand AS "productBrand",
  p."imageUrl" AS "productImageUrl", p.rating, p."reviewCount", p."createdAt" AS "productCreatedAt",
  c.slug AS "categorySlug", c.name AS "categoryName",
  r.name AS "cheapestRetailerName", r.slug AS "cheapestRetailerSlug", r."brandColor" AS "cheapestRetailerColor"
`

const FROM_JOIN = `
  FROM product_variants v
  JOIN products p ON p.id = v."productId"
  LEFT JOIN categories c ON c.id = p."categoryId"
  LEFT JOIN retailers r ON r.id = v."cheapestRetailerId"
`

interface SearchSqlParts {
  from: string
  where: string
  values: unknown[]
  orderBy: string
}

function buildSearchSql(filters: SearchFilters): SearchSqlParts {
  const values: unknown[] = []
  const clauses: string[] = []

  const rawQuery = (filters.query ?? '').trim()
  const normalized = rawQuery.toLowerCase()
  const hasQuery = normalized.length > 0

  // The SELECT list always references $1/$2 (trigram ranking and LIKE), so the
  // query slot must be bound in browse mode too — otherwise the pagination
  // parameters would collide with it and PostgreSQL would reject LIMIT $1.
  // Every bound parameter must also be *referenced* somewhere: PostgreSQL
  // cannot infer the type of an unused placeholder (42P18).
  if (hasQuery) {
    // Bound only when referenced: an unused placeholder makes PostgreSQL fail
    // with 42P18, and an unreferenced one fails the bind-parameter count.
    values.push(normalized, escapeLike(normalized))
    const rawParam = '$1'
    const likeParam = '$2'
    // The tsquery parameter is supplied by the caller-provided toTsQuery result;
    // we bind it separately below via a placeholder slot filled by searchProducts.
    clauses.push(`(
      p."searchVector" @@ __TSQUERY__::tsquery
      OR v."searchVector" @@ __TSQUERY__::tsquery
      -- word_similarity compares the query against the best-matching word in the
      -- title, so long titles still match short queries and typos. 0.45 sits
      -- between real typo matches (>= 0.5) and incidental overlaps such as
      -- 'airpods' matching the word 'air' in 'MacBook Air' (0.375).
      OR word_similarity(${rawParam}, lower(p.title)) >= 0.45
      OR word_similarity(${rawParam}, lower(v.title)) >= 0.45
      OR similarity(${rawParam}, lower(p.brand)) >= 0.4
      OR p.title ILIKE '%' || ${likeParam} || '%'
      OR p.brand ILIKE '%' || ${likeParam} || '%'
      OR coalesce(v."modelNumber", '') ILIKE '%' || ${likeParam} || '%'
      OR coalesce(v.sku, '') ILIKE '%' || ${likeParam} || '%'
    )`)
  } else {
    // Browse mode: only show variants that actually have offers.
    clauses.push(`v."lowestPrice" IS NOT NULL`)
  }

  const extra = andClauses(
    [
      filters.categorySlug ? { column: 'c.slug', value: filters.categorySlug } : null,
      filters.categorySlugs && filters.categorySlugs.length > 0
        ? { column: 'c.slug', value: filters.categorySlugs, op: 'ANY' as const }
        : null,
      filters.brands && filters.brands.length > 0
        ? { column: 'lower(p.brand)', value: filters.brands.map((b) => b.toLowerCase()), op: 'ANY' as const }
        : null,
      filters.minPrice !== undefined ? { column: 'v."lowestPrice"', value: filters.minPrice, op: '>=' as const } : null,
      filters.maxPrice !== undefined ? { column: 'v."lowestPrice"', value: filters.maxPrice, op: '<=' as const } : null,
      filters.minRating !== undefined ? { column: 'p.rating', value: filters.minRating, op: '>=' as const } : null,
      filters.minDiscount !== undefined
        ? { column: 'v."bestDiscountPercent"', value: filters.minDiscount, op: '>=' as const }
        : null,
      filters.inStockOnly ? { column: 'v."listingCount"', value: 0, op: '>' as const } : null,
    ],
    values.length + 1,
  )
  values.push(...extra.values)
  if (extra.sql) clauses.push(extra.sql.replace(/^AND /, ''))

  if (filters.freeDelivery) {
    clauses.push(`EXISTS (
      SELECT 1 FROM product_listings pl
      JOIN retailers rf ON rf.id = pl."retailerId" AND rf."isActive" = true
      LEFT JOIN LATERAL (
        SELECT p2."effectivePrice", p2."deliveryFee" FROM prices p2
        WHERE p2."listingId" = pl.id ORDER BY p2."checkedAt" DESC LIMIT 1
      ) pf ON true
      WHERE pl."productVariantId" = v.id AND pf."deliveryFee" = 0 AND pf."effectivePrice" > 0
    )`)
  }

  if (filters.retailerSlugs && filters.retailerSlugs.length > 0) {
    const ph = placeholders(filters.retailerSlugs, values.length + 1)
    values.push(...filters.retailerSlugs)
    clauses.push(`EXISTS (
      SELECT 1 FROM product_listings pl
      JOIN retailers rs ON rs.id = pl."retailerId" AND rs."isActive" = true
      WHERE pl."productVariantId" = v.id AND rs.slug IN (${ph})
    )`)
  }

  const sort = resolveSort(filters.sort) as SortKey
  const orderBy: Record<SortKey, string> = {
    relevance: hasQuery
      ? `(COALESCE(ts_rank_cd(p."searchVector", __TSQUERY__::tsquery), 0)
          + COALESCE(ts_rank_cd(v."searchVector", __TSQUERY__::tsquery), 0) * 1.5
          + GREATEST(similarity(lower(p.title), $1), similarity(lower(v.title), $1), similarity(lower(p.brand), $1))) DESC,
         v."lowestPrice" ASC NULLS LAST`
      : `v."lowestPrice" ASC NULLS LAST`,
    cheapest: `v."lowestPrice" ASC NULLS LAST, p.title ASC`,
    price_desc: `v."lowestPrice" DESC NULLS LAST, p.title ASC`,
    discount: `v."bestDiscountPercent" DESC, v."lowestPrice" ASC NULLS LAST`,
    rating: `p.rating DESC, p."reviewCount" DESC`,
    delivery: `v."fastestDeliveryDays" ASC NULLS LAST, v."lowestPrice" ASC NULLS LAST`,
    newest: `p."createdAt" DESC`,
  }

  return {
    from: FROM_JOIN,
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
    orderBy: orderBy[sort],
  }
}

function injectTsQuery(sql: string, tsQuery: string): string {
  return sql.replaceAll('__TSQUERY__', `'${tsQuery.replace(/'/g, "''")}'`)
}

/**
 * Search products and variants.
 *
 * Ranking combines PostgreSQL full-text search (weighted tsvector columns) with
 * pg_trgm similarity for typo tolerance, plus ILIKE fallbacks on brand, model
 * number and SKU. Prices come from denormalised rollups so the listing query
 * stays a single round-trip.
 */
export async function searchProducts(
  filters: SearchFilters,
  options: { tsQuery: string } = { tsQuery: '' },
): Promise<SearchResult> {
  const started = Date.now()
  const sort = resolveSort(filters.sort) as SortKey
  const pagination = resolvePagination(filters.page, filters.pageSize)
  const parts = buildSearchSql(filters)
  const tsQuery = options.tsQuery || ''

  // Ranking expressions are emitted only when a query was supplied: in browse
  // mode the count query references no parameters at all, so binding $1 would
  // mismatch the prepared statement.
  const hasQuery = (filters.query ?? '').trim().length > 0
  const ftsRankExpr = 'COALESCE(ts_rank_cd(p."searchVector", __TSQUERY__::tsquery), 0)'
  const trgmRankExpr =
    'GREATEST(word_similarity($1, lower(p.title)), word_similarity($1, lower(v.title)), similarity($1, lower(p.brand)))'
  const relevanceExpr = hasQuery
    ? `(${ftsRankExpr} + COALESCE(ts_rank_cd(v."searchVector", __TSQUERY__::tsquery), 0) * 1.5 + ${trgmRankExpr})`
    : '0::float8'
  const ftsRank = hasQuery ? ftsRankExpr : '0::float8'
  const trgmRank = hasQuery ? trgmRankExpr : '0::float8'

  const selectSql = injectTsQuery(
    `SELECT ${VARIANT_SELECT}, ${PRODUCT_JOIN_SELECT},
            ${relevanceExpr} AS relevance,
            ${ftsRank} AS "ftsRank",
            ${trgmRank} AS "trgmRank"
     ${parts.from} ${parts.where}`,
    tsQuery,
  )

  const countSql = injectTsQuery(`SELECT count(*)::int AS n ${parts.from} ${parts.where}`, tsQuery)

  const pageValues = [...parts.values, pagination.pageSize, pagination.offset]
  const pageSql = injectTsQuery(
    `${selectSql} ORDER BY ${parts.orderBy} LIMIT $${parts.values.length + 1} OFFSET $${parts.values.length + 2}`,
    tsQuery,
  )

  const [rows, countRow] = await Promise.all([
    db.query<SearchRowShape>(pageSql, pageValues),
    db.queryOne<{ n: number }>(countSql, parts.values),
  ])

  const total = countRow?.n ?? 0
  const rawQuery = (filters.query ?? '').trim()

  return {
    items: rows.map((row) => ({
      variant: mapVariantRow(row),
      productId: row.productId,
      productTitle: row.productTitle,
      productSlug: row.productSlug,
      productBrand: row.productBrand,
      productImageUrl: row.productImageUrl,
      rating: row.rating,
      reviewCount: row.reviewCount,
      categorySlug: row.categorySlug,
      categoryName: row.categoryName,
      cheapestRetailerName: row.cheapestRetailerName,
      cheapestRetailerSlug: row.cheapestRetailerSlug,
      cheapestRetailerColor: row.cheapestRetailerColor,
      relevance: Number(row.relevance ?? 0),
      ftsRank: Number(row.ftsRank ?? 0),
      trgmRank: Number(row.trgmRank ?? 0),
    })),
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    sort,
    tookMs: Date.now() - started,
    strategy: !rawQuery ? 'browse' : tsQuery ? 'fulltext' : 'trigram',
  }
}

type SearchRowShape = VariantRow & {
  productId: string
  productTitle: string
  productSlug: string
  productBrand: string
  productImageUrl: string | null
  rating: number
  reviewCount: number
  categorySlug: string | null
  categoryName: string | null
  cheapestRetailerName: string | null
  cheapestRetailerSlug: string | null
  cheapestRetailerColor: string | null
  relevance: number | null
  ftsRank: number | null
  trgmRank: number | null
}

export function mapVariantRow(row: VariantRow): VariantRow {
  return {
    id: row.id,
    productId: row.productId,
    title: row.title,
    slug: row.slug,
    sku: row.sku ?? null,
    modelNumber: row.modelNumber ?? null,
    gtin: row.gtin ?? null,
    color: row.color ?? null,
    size: row.size ?? null,
    storage: row.storage ?? null,
    imageUrl: row.imageUrl ?? null,
    specifications: (row.specifications as Record<string, unknown> | null) ?? null,
    lowestPrice: row.lowestPrice ?? null,
    highestPrice: row.highestPrice ?? null,
    cheapestListingId: row.cheapestListingId ?? null,
    cheapestRetailerId: row.cheapestRetailerId ?? null,
    listingCount: row.listingCount ?? 0,
    bestDiscountPercent: row.bestDiscountPercent ?? 0,
    fastestDeliveryDays: row.fastestDeliveryDays ?? null,
    rollupsUpdatedAt: row.rollupsUpdatedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Every current offer (latest price per listing) for a set of variants — one query. */
export async function listOffersForVariants(variantIds: string[]): Promise<RetailerOffer[]> {
  if (variantIds.length === 0) return []
  const rows = await db.query<OfferRow>(
    `SELECT ${OFFER_SELECT} ${OFFER_FROM}
     WHERE pl."productVariantId" IN (${placeholders(variantIds, 1)})
     ORDER BY pr."effectivePrice" ASC NULLS LAST`,
    variantIds,
  )
  return rows.map(mapOfferRow)
}

export async function listOffersForVariant(variantId: string): Promise<RetailerOffer[]> {
  return listOffersForVariants([variantId])
}

export interface VariantWithProduct extends VariantRow {
  productTitle: string
  productSlug: string
  productBrand: string
  productDescription: string | null
  productImageUrl: string | null
  rating: number
  reviewCount: number
  categoryId: string
  categorySlug: string | null
  categoryName: string | null
  cheapestRetailerName: string | null
}

export async function findVariantBySlug(slug: string): Promise<VariantWithProduct | null> {
  return db.queryOne<VariantWithProduct>(
    `SELECT ${VARIANT_SELECT}, p.title AS "productTitle", p.slug AS "productSlug",
            p.brand AS "productBrand", p.description AS "productDescription", p."imageUrl" AS "productImageUrl",
            p.rating, p."reviewCount", p."categoryId", c.slug AS "categorySlug", c.name AS "categoryName",
            r.name AS "cheapestRetailerName"
     ${FROM_JOIN}
     WHERE v.slug = $1`,
    [slug],
  )
}

export async function findVariantById(id: string): Promise<VariantWithProduct | null> {
  return db.queryOne<VariantWithProduct>(
    `SELECT ${VARIANT_SELECT}, p.title AS "productTitle", p.slug AS "productSlug",
            p.brand AS "productBrand", p.description AS "productDescription", p."imageUrl" AS "productImageUrl",
            p.rating, p."reviewCount", p."categoryId", c.slug AS "categorySlug", c.name AS "categoryName",
            r.name AS "cheapestRetailerName"
     ${FROM_JOIN}
     WHERE v.id = $1`,
    [id],
  )
}

export async function listVariantsForProduct(productId: string): Promise<VariantRow[]> {
  const rows = await db.query<VariantRow>(
    `SELECT ${VARIANT_SELECT} FROM product_variants v
     WHERE v."productId" = $1
     ORDER BY v."lowestPrice" ASC NULLS LAST, v.title ASC`,
    [productId],
  )
  return rows.map(mapVariantRow)
}

export async function findProductBySlug(slug: string): Promise<ProductRow | null> {
  return db.queryOne<ProductRow>(
    `SELECT p.id, p.title, p.slug, p.brand, p.description, p."categoryId", p."imageUrl", p.rating,
            p."reviewCount", p."lowestPrice", p."highestPrice", p."cheapestRetailerId", p."updatedAtPriceAt",
            p."createdAt", p."updatedAt", c.slug AS "categorySlug", c.name AS "categoryName",
            r.name AS "cheapestRetailerName"
     FROM products p
     LEFT JOIN categories c ON c.id = p."categoryId"
     LEFT JOIN retailers r ON r.id = p."cheapestRetailerId"
     WHERE p.slug = $1`,
    [slug],
  )
}

export async function findProductById(id: string): Promise<ProductRow | null> {
  return db.queryOne<ProductRow>(
    `SELECT p.id, p.title, p.slug, p.brand, p.description, p."categoryId", p."imageUrl", p.rating,
            p."reviewCount", p."lowestPrice", p."highestPrice", p."cheapestRetailerId", p."updatedAtPriceAt",
            p."createdAt", p."updatedAt"
     FROM products p WHERE p.id = $1`,
    [id],
  )
}

export async function listListingIdsForVariant(variantId: string): Promise<string[]> {
  const rows = await db.query<{ id: string }>(
    `SELECT pl.id FROM product_listings pl WHERE pl."productVariantId" = $1`,
    [variantId],
  )
  return rows.map((r) => r.id)
}

/** Refresh denormalised comparison rollups for one variant from stored offers. */
export async function refreshVariantRollups(
  variantId: string,
  client?: DatabaseClient,
): Promise<{ lowestPrice: number | null; cheapestListingId: string | null; cheapestRetailerId: string | null }> {
  const c = await withClient(client)
  const offers = await listOffersForVariantsWithClient(variantId, c)
  const comparable = offers.filter(
    (o) =>
      o.resolutionStatus === 'RESOLVED' &&
      o.inStock &&
      o.availability !== 'OUT_OF_STOCK' &&
      o.effectivePrice > 0,
  )
  const sorted = [...comparable].sort((a, b) => a.effectivePrice - b.effectivePrice)
  const cheapest = sorted[0] ?? null
  const highest = comparable.length ? Math.max(...comparable.map((o) => o.effectivePrice)) : null
  // Discount and delivery rollups use the comparable set too: an unresolved
  // listing is not proven to be this product, and one mis-matched ₹399
  // accessory once made an iPhone 16 the site's biggest "69% off" deal.
  const bestDiscount = comparable.reduce((max, o) => {
    const pct = o.mrp > 0 ? ((o.mrp - o.price) / o.mrp) * 100 : 0
    return pct > max ? pct : max
  }, 0)
  const deliveryDays = comparable
    .map((o) => o.deliveryDays)
    .filter((d): d is number => typeof d === 'number')
    .sort((a, b) => a - b)

  await c.execute(
    `UPDATE product_variants SET
        "lowestPrice" = $2,
        "highestPrice" = $3,
        "cheapestListingId" = $4,
        "cheapestRetailerId" = $5,
        "listingCount" = $6,
        "bestDiscountPercent" = $7,
        "fastestDeliveryDays" = $8,
        "rollupsUpdatedAt" = now(),
        "updatedAt" = now()
     WHERE id = $1`,
    [
      variantId,
      cheapest ? cheapest.effectivePrice : null,
      highest,
      cheapest ? cheapest.listingId : null,
      cheapest ? cheapest.retailerId : null,
      comparable.length,
      Math.round(bestDiscount),
      deliveryDays[0] ?? null,
    ],
  )

  return {
    lowestPrice: cheapest ? cheapest.effectivePrice : null,
    cheapestListingId: cheapest ? cheapest.listingId : null,
    cheapestRetailerId: cheapest ? cheapest.retailerId : null,
  }
}

async function listOffersForVariantsWithClient(variantId: string, c: DatabaseClient): Promise<RetailerOffer[]> {
  const rows = await c.query<OfferRow>(
    `SELECT ${OFFER_SELECT} ${OFFER_FROM} WHERE pl."productVariantId" = $1`,
    [variantId],
  )
  return rows.map(mapOfferRow)
}

/** Propagates variant rollups up to the product level (product cards / listings). */
export async function refreshProductRollups(productId: string, client?: DatabaseClient): Promise<void> {
  const c = await withClient(client)
  await c.execute(
    `UPDATE products p SET
        "lowestPrice" = (SELECT min(v."lowestPrice") FROM product_variants v WHERE v."productId" = p.id),
        "highestPrice" = (SELECT max(v."highestPrice") FROM product_variants v WHERE v."productId" = p.id),
        "cheapestRetailerId" = (
          SELECT v2."cheapestRetailerId" FROM product_variants v2
          WHERE v2."productId" = p.id AND v2."lowestPrice" IS NOT NULL
          ORDER BY v2."lowestPrice" ASC LIMIT 1
        ),
        "updatedAtPriceAt" = now(),
        "updatedAt" = now()
     WHERE p.id = $1`,
    [productId],
  )
}

/** Distinct brands available in the catalogue (filter facet). */
export async function listBrands(categorySlug?: string): Promise<string[]> {
  const rows = categorySlug
    ? await db.query<{ brand: string }>(
        `SELECT DISTINCT p.brand FROM products p
         JOIN categories c ON c.id = p."categoryId"
         WHERE c.slug = $1 ORDER BY p.brand ASC`,
        [categorySlug],
      )
    : await db.query<{ brand: string }>(`SELECT DISTINCT p.brand FROM products p ORDER BY p.brand ASC`)
  return rows.map((r) => r.brand)
}

export interface DealRow {
  variantId: string
  variantSlug: string
  variantTitle: string
  imageUrl: string | null
  productId: string
  productTitle: string
  productSlug: string
  brand: string
  rating: number
  reviewCount: number
  categorySlug: string | null
  categoryName: string | null
  lowestPrice: number | null
  highestPrice: number | null
  bestDiscountPercent: number
  cheapestRetailerName: string | null
  cheapestRetailerSlug: string | null
  cheapestRetailerColor: string | null
  listingCount: number
  /** Set only for the price-drop feed: how much the price fell. */
  dropAmount?: number | null
  dropPercent?: number | null
  checkedAt?: Date | null
}

const DEAL_SELECT = `
  v.id AS "variantId", v.slug AS "variantSlug", v.title AS "variantTitle",
  COALESCE(v."imageUrl", p."imageUrl") AS "imageUrl",
  p.id AS "productId", p.title AS "productTitle", p.slug AS "productSlug", p.brand,
  p.rating, p."reviewCount", c.slug AS "categorySlug", c.name AS "categoryName",
  v."lowestPrice", v."highestPrice", v."bestDiscountPercent", v."listingCount",
  r.name AS "cheapestRetailerName", r.slug AS "cheapestRetailerSlug", r."brandColor" AS "cheapestRetailerColor"
`

const DEAL_FROM = `
  FROM product_variants v
  JOIN products p ON p.id = v."productId"
  LEFT JOIN categories c ON c.id = p."categoryId"
  LEFT JOIN retailers r ON r.id = v."cheapestRetailerId"
`

/** Best deals: biggest genuine discounts on variants with a real MRP and a price. */
export async function listBestDeals(limit = 12): Promise<DealRow[]> {
  return db.query<DealRow>(
    `SELECT ${DEAL_SELECT} ${DEAL_FROM}
     WHERE v."lowestPrice" IS NOT NULL AND v."bestDiscountPercent" > 0
     ORDER BY v."bestDiscountPercent" DESC, v."lowestPrice" ASC
     LIMIT $1`,
    [limit],
  )
}

/** Products under a price ceiling. */
export async function listUnderPrice(maxPaise: number, limit = 12): Promise<DealRow[]> {
  return db.query<DealRow>(
    `SELECT ${DEAL_SELECT} ${DEAL_FROM}
     WHERE v."lowestPrice" IS NOT NULL AND v."lowestPrice" <= $1
     ORDER BY v."bestDiscountPercent" DESC, v."lowestPrice" ASC
     LIMIT $2`,
    [maxPaise, limit],
  )
}

/**
 * Biggest price drops: compares the current cheapest effective price with the
 * cheapest effective price recorded roughly a week ago. Computed from stored
 * history — nothing is fabricated.
 */
export async function listBiggestPriceDrops(limit = 12, lookbackDays = 7): Promise<DealRow[]> {
  return db.query<DealRow>(
    `WITH current_prices AS (
       SELECT pl."productVariantId" AS vid, min(pr."effectivePrice") AS current_price, max(pr."checkedAt") AS checked_at
       FROM product_listings pl
       JOIN retailers rr ON rr.id = pl."retailerId" AND rr."isActive" = true
       LEFT JOIN LATERAL (
         SELECT p."effectivePrice", p."checkedAt" FROM prices p
         WHERE p."listingId" = pl.id ORDER BY p."checkedAt" DESC LIMIT 1
       ) pr ON true
       WHERE pl."resolutionStatus" <> 'UNMATCHED' AND pr."effectivePrice" > 0
       GROUP BY pl."productVariantId"
     ),
     past_prices AS (
       SELECT pl."productVariantId" AS vid, min(p."effectivePrice") AS past_price
       FROM product_listings pl
       JOIN prices p ON p."listingId" = pl.id
       WHERE p."checkedAt" >= now() - (($2 + 3) || ' days')::interval
         AND p."checkedAt" <= now() - (($2 - 2) || ' days')::interval
         AND p."effectivePrice" > 0
       GROUP BY pl."productVariantId"
     )
     SELECT ${DEAL_SELECT},
            (pp.past_price - cp.current_price) AS "dropAmount",
            round(((pp.past_price - cp.current_price)::numeric / nullif(pp.past_price, 0)) * 100, 1) AS "dropPercent",
            cp.checked_at AS "checkedAt"
     FROM current_prices cp
     JOIN past_prices pp ON pp.vid = cp.vid
     JOIN product_variants v ON v.id = cp.vid
     JOIN products p ON p.id = v."productId"
     LEFT JOIN categories c ON c.id = p."categoryId"
     LEFT JOIN retailers r ON r.id = v."cheapestRetailerId"
     WHERE pp.past_price > cp.current_price
     ORDER BY (pp.past_price - cp.current_price) DESC
     LIMIT $1`,
    [limit, String(lookbackDays)],
  )
}

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

export interface CreateProductInput {
  title: string
  slug: string
  brand: string
  description?: string | null
  categoryId: string
  imageUrl?: string | null
  rating?: number
  reviewCount?: number
}

export async function createProduct(input: CreateProductInput): Promise<ProductRow> {
  return (await db.queryOne<ProductRow>(
    `INSERT INTO products (id, title, slug, brand, description, "categoryId", "imageUrl", rating, "reviewCount", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now(), now())
     RETURNING id, title, slug, brand, description, "categoryId", "imageUrl", rating, "reviewCount",
               "lowestPrice", "highestPrice", "cheapestRetailerId", "updatedAtPriceAt", "createdAt", "updatedAt"`,
    [
      cuid(), input.title, input.slug, input.brand, input.description ?? null, input.categoryId,
      input.imageUrl ?? null, input.rating ?? 0, input.reviewCount ?? 0,
    ],
  ))!
}

export async function updateProduct(
  id: string,
  patch: Partial<Omit<CreateProductInput, 'slug'>> & { slug?: string },
): Promise<ProductRow | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let index = 1
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    fields.push(`"${key}" = $${index++}`)
    values.push(value)
  }
  if (fields.length === 0) return findProductById(id)
  fields.push(`"updatedAt" = now()`)
  values.push(id)
  return db.queryOne<ProductRow>(
    `UPDATE products SET ${fields.join(', ')} WHERE id = $${index}
     RETURNING id, title, slug, brand, description, "categoryId", "imageUrl", rating, "reviewCount",
               "lowestPrice", "highestPrice", "cheapestRetailerId", "updatedAtPriceAt", "createdAt", "updatedAt"`,
    values,
  )
}

export async function deleteProduct(id: string): Promise<boolean> {
  const affected = await db.execute(`DELETE FROM products WHERE id = $1`, [id])
  return affected > 0
}

export interface AdminProductRow extends ProductRow {
  categoryName: string | null
  variantCount: number
  listingCount: number
}

export async function listProductsForAdmin(params: {
  query?: string
  page?: number
  pageSize?: number
}): Promise<{ items: AdminProductRow[]; total: number; page: number; pageSize: number }> {
  const pagination = resolvePagination(params.page, params.pageSize, 50)
  const values: unknown[] = []
  let where = ''
  if (params.query && params.query.trim()) {
    values.push(`%${escapeLike(params.query.trim().toLowerCase())}%`)
    where = `WHERE lower(p.title) LIKE $1 OR lower(p.brand) LIKE $1`
  }
  const items = await db.query<AdminProductRow>(
    `SELECT p.id, p.title, p.slug, p.brand, p.description, p."categoryId", p."imageUrl", p.rating,
            p."reviewCount", p."lowestPrice", p."highestPrice", p."cheapestRetailerId", p."updatedAtPriceAt",
            p."createdAt", p."updatedAt", c.name AS "categoryName",
            (SELECT count(*)::int FROM product_variants v WHERE v."productId" = p.id) AS "variantCount",
            (SELECT count(*)::int FROM product_listings pl
               JOIN product_variants v2 ON v2.id = pl."productVariantId"
              WHERE v2."productId" = p.id) AS "listingCount"
     FROM products p
     LEFT JOIN categories c ON c.id = p."categoryId"
     ${where}
     ORDER BY p."updatedAt" DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, pagination.pageSize, pagination.offset],
  )
  const total = await db.queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM products p ${where}`, values)
  return { items, total: total?.n ?? 0, page: pagination.page, pageSize: pagination.pageSize }
}

export async function countProducts(): Promise<number> {
  const row = await db.queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM products`)
  return row?.n ?? 0
}

export async function countVariants(): Promise<number> {
  const row = await db.queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM product_variants`)
  return row?.n ?? 0
}

export async function countListings(): Promise<number> {
  const row = await db.queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM product_listings`)
  return row?.n ?? 0
}
