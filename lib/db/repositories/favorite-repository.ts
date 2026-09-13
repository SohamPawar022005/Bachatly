import { db } from '@/lib/db/client'
import { cuid } from '@/lib/utils/id'

export interface FavoriteRow {
  id: string
  userId: string
  productVariantId: string
  createdAt: Date
}

export interface FavoriteWithProduct {
  id: string
  productVariantId: string
  createdAt: Date
  variantSlug: string
  variantTitle: string
  imageUrl: string | null
  productId: string
  productTitle: string
  productSlug: string
  brand: string
  rating: number
  lowestPrice: number | null
  highestPrice: number | null
  listingCount: number
  cheapestRetailerName: string | null
  cheapestRetailerSlug: string | null
  bestDiscountPercent: number
}

const FAVORITE_PRODUCT_SELECT = `
  f.id, f."productVariantId", f."createdAt",
  v.slug AS "variantSlug", v.title AS "variantTitle", COALESCE(v."imageUrl", p."imageUrl") AS "imageUrl",
  p.id AS "productId", p.title AS "productTitle", p.slug AS "productSlug", p.brand, p.rating,
  v."lowestPrice", v."highestPrice", v."listingCount", v."bestDiscountPercent",
  r.name AS "cheapestRetailerName", r.slug AS "cheapestRetailerSlug"
`

const FAVORITE_PRODUCT_FROM = `
  FROM favorites f
  JOIN product_variants v ON v.id = f."productVariantId"
  JOIN products p ON p.id = v."productId"
  LEFT JOIN retailers r ON r.id = v."cheapestRetailerId"
`

export async function listFavorites(userId: string): Promise<FavoriteWithProduct[]> {
  return db.query<FavoriteWithProduct>(
    `SELECT ${FAVORITE_PRODUCT_SELECT} ${FAVORITE_PRODUCT_FROM}
     WHERE f."userId" = $1
     ORDER BY f."createdAt" DESC`,
    [userId],
  )
}

export async function isFavorite(userId: string, productVariantId: string): Promise<boolean> {
  const row = await db.queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM favorites WHERE "userId" = $1 AND "productVariantId" = $2`,
    [userId, productVariantId],
  )
  return (row?.n ?? 0) > 0
}

/** Adds a favorite. Duplicates are impossible (unique index) and return the existing row. */
export async function addFavorite(userId: string, productVariantId: string): Promise<{ row: FavoriteRow; created: boolean }> {
  const row = await db.queryOne<FavoriteRow & { created: boolean }>(
    `INSERT INTO favorites (id, "userId", "productVariantId", "createdAt")
     VALUES ($1,$2,$3, now())
     ON CONFLICT ("userId", "productVariantId") DO UPDATE SET "userId" = EXCLUDED."userId"
     RETURNING id, "userId", "productVariantId", "createdAt",
               (xmax = 0) AS created`,
    [cuid(), userId, productVariantId],
  )
  return { row: row!, created: Boolean(row?.created) }
}

export async function removeFavorite(id: string, userId: string): Promise<boolean> {
  const affected = await db.execute(`DELETE FROM favorites WHERE id = $1 AND "userId" = $2`, [id, userId])
  return affected > 0
}

export async function removeFavoriteByVariant(userId: string, productVariantId: string): Promise<boolean> {
  const affected = await db.execute(
    `DELETE FROM favorites WHERE "userId" = $1 AND "productVariantId" = $2`,
    [userId, productVariantId],
  )
  return affected > 0
}

export async function countFavorites(userId: string): Promise<number> {
  const row = await db.queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM favorites WHERE "userId" = $1`, [userId])
  return row?.n ?? 0
}

/** Variant ids a user has favourited — used to render filled heart icons. */
export async function listFavoriteVariantIds(userId: string): Promise<string[]> {
  const rows = await db.query<{ id: string }>(`SELECT "productVariantId" AS id FROM favorites WHERE "userId" = $1`, [userId])
  return rows.map((r) => r.id)
}
