import { db } from '@/lib/db/client'
import { cuid } from '@/lib/utils/id'

export interface PriceAlertRow {
  id: string
  userId: string
  productVariantId: string
  targetPrice: number
  isActive: boolean
  triggeredAt: Date | null
  triggeredPrice: number | null
  createdAt: Date
  updatedAt: Date
}

export interface PriceAlertWithProduct extends PriceAlertRow {
  variantSlug: string
  variantTitle: string
  imageUrl: string | null
  productTitle: string
  productSlug: string
  brand: string
  currentPrice: number | null
  cheapestRetailerName: string | null
  cheapestRetailerSlug: string | null
  listingCount: number
}

const ALERT_SELECT = `
  pa.id, pa."userId", pa."productVariantId", pa."targetPrice", pa."isActive",
  pa."triggeredAt", pa."triggeredPrice", pa."createdAt", pa."updatedAt"
`

export async function listAlerts(userId: string, activeOnly = false): Promise<PriceAlertWithProduct[]> {
  return db.query<PriceAlertWithProduct>(
    `SELECT ${ALERT_SELECT},
            v.slug AS "variantSlug", v.title AS "variantTitle", COALESCE(v."imageUrl", p."imageUrl") AS "imageUrl",
            p.title AS "productTitle", p.slug AS "productSlug", p.brand,
            v."lowestPrice" AS "currentPrice", v."listingCount",
            r.name AS "cheapestRetailerName", r.slug AS "cheapestRetailerSlug"
     FROM price_alerts pa
     JOIN product_variants v ON v.id = pa."productVariantId"
     JOIN products p ON p.id = v."productId"
     LEFT JOIN retailers r ON r.id = v."cheapestRetailerId"
     WHERE pa."userId" = $1 ${activeOnly ? `AND pa."isActive" = true` : ''}
     ORDER BY pa."createdAt" DESC`,
    [userId],
  )
}

export async function findAlert(id: string, userId: string): Promise<PriceAlertRow | null> {
  return db.queryOne<PriceAlertRow>(
    `SELECT ${ALERT_SELECT} FROM price_alerts pa WHERE pa.id = $1 AND pa."userId" = $2`,
    [id, userId],
  )
}

export async function createAlert(input: {
  userId: string
  productVariantId: string
  targetPrice: number
}): Promise<{ row: PriceAlertRow; created: boolean }> {
  const row = await db.queryOne<PriceAlertRow & { created: boolean }>(
    `INSERT INTO price_alerts AS pa (id, "userId", "productVariantId", "targetPrice", "isActive", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,true, now(), now())
     ON CONFLICT ("userId", "productVariantId") DO UPDATE SET
        "targetPrice" = EXCLUDED."targetPrice",
        "isActive" = true,
        "triggeredAt" = NULL,
        "triggeredPrice" = NULL,
        "updatedAt" = now()
     RETURNING ${ALERT_SELECT}, (xmax = 0) AS created`,
    [cuid(), input.userId, input.productVariantId, input.targetPrice],
  )
  return { row: row!, created: Boolean(row?.created) }
}

export async function deleteAlert(id: string, userId: string): Promise<boolean> {
  const affected = await db.execute(`DELETE FROM price_alerts WHERE id = $1 AND "userId" = $2`, [id, userId])
  return affected > 0
}

export async function countAlerts(userId: string, activeOnly = true): Promise<number> {
  const row = await db.queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM price_alerts WHERE "userId" = $1 ${activeOnly ? `AND "isActive" = true` : ''}`,
    [userId],
  )
  return row?.n ?? 0
}

export interface TriggerableAlert extends PriceAlertRow {
  variantSlug: string
  variantTitle: string
  productTitle: string
  productSlug: string
  currentPrice: number
  cheapestRetailerName: string | null
}

/**
 * Active alerts whose target price is at or above the current cheapest price.
 * Alerts that already fired for this price level are skipped so a user is not
 * notified repeatedly for the same drop.
 */
export async function listTriggerableAlerts(limit = 500): Promise<TriggerableAlert[]> {
  return db.query<TriggerableAlert>(
    `SELECT ${ALERT_SELECT},
            v.slug AS "variantSlug", v.title AS "variantTitle",
            p.title AS "productTitle", p.slug AS "productSlug",
            v."lowestPrice" AS "currentPrice",
            r.name AS "cheapestRetailerName"
     FROM price_alerts pa
     JOIN product_variants v ON v.id = pa."productVariantId"
     JOIN products p ON p.id = v."productId"
     LEFT JOIN retailers r ON r.id = v."cheapestRetailerId"
     WHERE pa."isActive" = true
       AND v."lowestPrice" IS NOT NULL
       AND v."lowestPrice" <= pa."targetPrice"
       AND (pa."triggeredAt" IS NULL OR pa."triggeredPrice" IS NULL OR pa."triggeredPrice" > v."lowestPrice")
     ORDER BY pa."createdAt" ASC
     LIMIT $1`,
    [limit],
  )
}

export async function markAlertTriggered(alertId: string, price: number): Promise<void> {
  await db.execute(
    `UPDATE price_alerts SET "triggeredAt" = now(), "triggeredPrice" = $2, "updatedAt" = now() WHERE id = $1`,
    [alertId, price],
  )
}

export async function countActiveAlerts(): Promise<number> {
  const row = await db.queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM price_alerts WHERE "isActive" = true`)
  return row?.n ?? 0
}

export async function listAlertsForVariant(variantId: string): Promise<PriceAlertRow[]> {
  return db.query<PriceAlertRow>(
    `SELECT ${ALERT_SELECT} FROM price_alerts pa WHERE pa."productVariantId" = $1 AND pa."isActive" = true`,
    [variantId],
  )
}
