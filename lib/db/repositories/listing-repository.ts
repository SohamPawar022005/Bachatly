import { db } from '@/lib/db/client'
import type { DatabaseClient, ListingRow } from '@/lib/db/types'
import { placeholders, withClient } from '@/lib/db/query-helpers'
import { cuid } from '@/lib/utils/id'

const LISTING_SELECT = `
  pl.id, pl."productVariantId", pl."retailerId", pl."retailerProductId", pl."rawTitle",
  pl."normalizedTitle", pl."productUrl", pl."affiliateUrl", pl.availability, pl."deliveryText",
  pl."deliveryFee", pl."deliveryDays", pl.source, pl."lastCheckedAt", pl."resolutionStatus",
  pl."matchConfidence", pl."createdAt", pl."updatedAt"
`

export interface CreateListingInput {
  id?: string
  productVariantId: string
  retailerId: string
  retailerProductId: string
  rawTitle: string
  normalizedTitle: string
  productUrl: string
  affiliateUrl?: string | null
  availability?: ListingRow['availability']
  deliveryText?: string | null
  deliveryFee?: number
  deliveryDays?: number | null
  source?: ListingRow['source']
  resolutionStatus?: ListingRow['resolutionStatus']
  matchConfidence?: number
}

export async function upsertListing(input: CreateListingInput, client?: DatabaseClient): Promise<ListingRow> {
  const c = await withClient(client)
  const row = await c.queryOne<ListingRow>(
    `INSERT INTO product_listings AS pl
       (id, "productVariantId", "retailerId", "retailerProductId", "rawTitle", "normalizedTitle",
        "productUrl", "affiliateUrl", availability, "deliveryText", "deliveryFee", "deliveryDays",
        source, "resolutionStatus", "matchConfidence", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now(), now())
     ON CONFLICT ("retailerId", "retailerProductId") DO UPDATE SET
        "productVariantId" = EXCLUDED."productVariantId",
        "rawTitle" = EXCLUDED."rawTitle",
        "normalizedTitle" = EXCLUDED."normalizedTitle",
        "productUrl" = EXCLUDED."productUrl",
        "affiliateUrl" = EXCLUDED."affiliateUrl",
        availability = EXCLUDED.availability,
        "deliveryText" = EXCLUDED."deliveryText",
        "deliveryFee" = EXCLUDED."deliveryFee",
        "deliveryDays" = EXCLUDED."deliveryDays",
        source = EXCLUDED.source,
        "resolutionStatus" = EXCLUDED."resolutionStatus",
        "matchConfidence" = EXCLUDED."matchConfidence",
        "updatedAt" = now()
     RETURNING ${LISTING_SELECT}`,
    [
      input.id ?? cuid(),
      input.productVariantId,
      input.retailerId,
      input.retailerProductId,
      input.rawTitle,
      input.normalizedTitle,
      input.productUrl,
      input.affiliateUrl ?? null,
      input.availability ?? 'UNKNOWN',
      input.deliveryText ?? null,
      input.deliveryFee ?? 0,
      input.deliveryDays ?? null,
      input.source ?? 'DEMO',
      input.resolutionStatus ?? 'RESOLVED',
      input.matchConfidence ?? 100,
    ],
  )
  return row!
}

export async function findListing(retailerId: string, retailerProductId: string): Promise<ListingRow | null> {
  return db.queryOne<ListingRow>(
    `SELECT ${LISTING_SELECT} FROM product_listings pl
     WHERE pl."retailerId" = $1 AND pl."retailerProductId" = $2`,
    [retailerId, retailerProductId],
  )
}

export async function listListingsForVariant(variantId: string): Promise<ListingRow[]> {
  return db.query<ListingRow>(
    `SELECT ${LISTING_SELECT} FROM product_listings pl WHERE pl."productVariantId" = $1`,
    [variantId],
  )
}

export async function updateListingAvailability(
  listingId: string,
  patch: { availability?: ListingRow['availability']; deliveryText?: string | null; lastCheckedAt?: Date },
  client?: DatabaseClient,
): Promise<void> {
  const c = await withClient(client)
  await c.execute(
    `UPDATE product_listings SET
        availability = COALESCE($2, availability),
        "deliveryText" = COALESCE($3, "deliveryText"),
        "lastCheckedAt" = COALESCE($4, "lastCheckedAt"),
        "updatedAt" = now()
     WHERE id = $1`,
    [listingId, patch.availability ?? null, patch.deliveryText ?? null, patch.lastCheckedAt ?? null],
  )
}

export interface ListingWithProduct extends ListingRow {
  retailerName: string
  retailerSlug: string
  variantSlug: string
  variantTitle: string
  productTitle: string
  productSlug: string
  latestPrice: number | null
  latestEffectivePrice: number | null
  latestCheckedAt: Date | null
}

export async function listListingsForAdmin(params: {
  variantId?: string
  retailerId?: string
  resolutionStatus?: ListingRow['resolutionStatus']
  limit?: number
}): Promise<ListingWithProduct[]> {
  const values: unknown[] = []
  const clauses: string[] = []
  if (params.variantId) {
    values.push(params.variantId)
    clauses.push(`pl."productVariantId" = $${values.length}`)
  }
  if (params.retailerId) {
    values.push(params.retailerId)
    clauses.push(`pl."retailerId" = $${values.length}`)
  }
  if (params.resolutionStatus) {
    values.push(params.resolutionStatus)
    clauses.push(`pl."resolutionStatus" = $${values.length}`)
  }
  const limit = params.limit ?? 100
  values.push(limit)
  return db.query<ListingWithProduct>(
    `SELECT ${LISTING_SELECT},
            r.name AS "retailerName", r.slug AS "retailerSlug",
            v.slug AS "variantSlug", v.title AS "variantTitle",
            p.title AS "productTitle", p.slug AS "productSlug",
            lp.price AS "latestPrice", lp."effectivePrice" AS "latestEffectivePrice", lp."checkedAt" AS "latestCheckedAt"
     FROM product_listings pl
     JOIN retailers r ON r.id = pl."retailerId"
     JOIN product_variants v ON v.id = pl."productVariantId"
     JOIN products p ON p.id = v."productId"
     LEFT JOIN LATERAL (
       SELECT pr.price, pr."effectivePrice", pr."checkedAt" FROM prices pr
       WHERE pr."listingId" = pl.id ORDER BY pr."checkedAt" DESC LIMIT 1
     ) lp ON true
     ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
     ORDER BY pl."updatedAt" DESC
     LIMIT $${values.length}`,
    values,
  )
}

export async function listActiveListingIds(limit?: number): Promise<string[]> {
  const rows = limit
    ? await db.query<{ id: string }>(
        `SELECT pl.id FROM product_listings pl
         JOIN retailers r ON r.id = pl."retailerId" AND r."isActive" = true
         WHERE pl."resolutionStatus" = 'RESOLVED'
         ORDER BY pl."lastCheckedAt" ASC NULLS FIRST
         LIMIT $1`,
        [limit],
      )
    : await db.query<{ id: string }>(
        `SELECT pl.id FROM product_listings pl
         JOIN retailers r ON r.id = pl."retailerId" AND r."isActive" = true
         WHERE pl."resolutionStatus" = 'RESOLVED'
         ORDER BY pl."lastCheckedAt" ASC NULLS FIRST`,
      )
  return rows.map((r) => r.id)
}

export async function deleteListingsForVariant(variantId: string): Promise<number> {
  return db.execute(`DELETE FROM product_listings WHERE "productVariantId" = $1`, [variantId])
}

export async function findListingsByIds(ids: string[]): Promise<ListingRow[]> {
  if (ids.length === 0) return []
  return db.query<ListingRow>(
    `SELECT ${LISTING_SELECT} FROM product_listings pl WHERE pl.id IN (${placeholders(ids, 1)})`,
    ids,
  )
}

export interface RefreshableListing {
  id: string
  retailerProductId: string
  retailerSlug: string
  retailerName: string
  productVariantId: string
  productId: string
}

/** Listings due for a price check, oldest-checked first. */
export async function listListingsForRefresh(limit?: number): Promise<RefreshableListing[]> {
  return db.query<RefreshableListing>(
    `SELECT pl.id, pl."retailerProductId", r.slug AS "retailerSlug", r.name AS "retailerName",
            pl."productVariantId", v."productId"
     FROM product_listings pl
     JOIN retailers r ON r.id = pl."retailerId" AND r."isActive" = true
     JOIN product_variants v ON v.id = pl."productVariantId"
     ORDER BY pl."lastCheckedAt" ASC NULLS FIRST, pl.id ASC
     ${limit ? 'LIMIT $1' : ''}`,
    limit ? [limit] : [],
  )
}
