import { db } from '@/lib/db/client'
import type { DatabaseClient, PriceRow } from '@/lib/db/types'
import { withClient, placeholders } from '@/lib/db/query-helpers'
import { cuid } from '@/lib/utils/id'
import { calculateEffectivePrice } from '@/lib/pricing/effective-price'

const PRICE_COLUMNS = `
  p.id, p."listingId", p.price, p.mrp, p.discount, p."deliveryFee",
  p."effectivePrice", p.currency, p."inStock", p."checkedAt"
`

export interface NewPriceInput {
  listingId: string
  price: number
  mrp?: number | null
  deliveryFee?: number | null
  /** Set false when the retailer did not publish a delivery fee. */
  deliveryFeeKnown?: boolean
  inStock?: boolean
  currency?: string
  checkedAt?: Date
  coupon?: { value: number; minSpend?: number } | null
}

/**
 * Appends a price record. Historical rows are NEVER updated — the whole point
 * of the price history feature is an immutable record of what a product cost.
 */
export async function appendPrice(input: NewPriceInput, client?: DatabaseClient): Promise<PriceRow> {
  const c = await withClient(client)
  const effective = calculateEffectivePrice({
    price: input.price,
    mrp: input.mrp ?? null,
    deliveryFee: input.deliveryFee ?? null,
    deliveryFeeKnown: input.deliveryFeeKnown ?? (input.deliveryFee !== null && input.deliveryFee !== undefined),
    coupon: input.coupon ?? null,
  })
  const row = await c.queryOne<PriceRow>(
    `INSERT INTO prices AS p (id, "listingId", price, mrp, discount, "deliveryFee", "effectivePrice", currency, "inStock", "checkedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10, now()))
     RETURNING ${PRICE_COLUMNS}`,
    [
      cuid(),
      input.listingId,
      effective.price,
      effective.mrp,
      effective.discount,
      effective.deliveryFee,
      effective.effectivePrice,
      input.currency ?? 'INR',
      input.inStock ?? true,
      input.checkedAt ?? null,
    ],
  )
  return row!
}

export interface PriceHistoryOptions {
  days?: number
  limit?: number
}

/** Price history for one listing, oldest first (chart-ready). */
export async function priceHistoryForListing(
  listingId: string,
  options: PriceHistoryOptions = {},
): Promise<PriceRow[]> {
  const days = options.days ?? 90
  const rows = await db.query<PriceRow>(
    `SELECT ${PRICE_COLUMNS}
     FROM prices p
     WHERE p."listingId" = $1 AND p."checkedAt" >= now() - ($2 || ' days')::interval
     ORDER BY p."checkedAt" ASC`,
    [listingId, String(days)],
  )
  if (options.limit && rows.length > options.limit) return rows.slice(-options.limit)
  return rows
}

/** History across all listings of a variant, keyed by listing. */
export async function priceHistoryForVariant(
  variantId: string,
  options: PriceHistoryOptions = {},
): Promise<Array<PriceRow & { retailerName: string; retailerSlug: string; retailerId: string }>> {
  const days = options.days ?? 90
  return db.query(
    // Only listings that resolved to this variant feed the history: a PENDING or
    // UNMATCHED listing is not proven to be the same product, so its prices
    // would poison the range (a mis-resolved ₹439 listing once made an iPhone
    // look like it had a ₹439 low).
    `SELECT ${PRICE_COLUMNS}, r.name AS "retailerName", r.slug AS "retailerSlug", r.id AS "retailerId"
     FROM prices p
     JOIN product_listings pl ON pl.id = p."listingId"
     JOIN retailers r ON r.id = pl."retailerId"
     WHERE pl."productVariantId" = $1
       AND pl."resolutionStatus" = 'RESOLVED'
       AND r."isActive" = true
       AND p."checkedAt" >= now() - ($2 || ' days')::interval
     ORDER BY p."checkedAt" ASC`,
    [variantId, String(days)],
  )
}

export async function countPriceRecords(): Promise<number> {
  const row = await db.queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM prices`)
  return row?.n ?? 0
}

export async function latestPriceForListing(listingId: string): Promise<PriceRow | null> {
  return db.queryOne<PriceRow>(
    `SELECT ${PRICE_COLUMNS} FROM prices p WHERE p."listingId" = $1 ORDER BY p."checkedAt" DESC, p.id DESC LIMIT 1`,
    [listingId],
  )
}

export async function priceRecordsSince(since: Date): Promise<number> {
  const row = await db.queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM prices WHERE "checkedAt" >= $1`,
    [since],
  )
  return row?.n ?? 0
}

export async function deletePricesForListings(listingIds: string[]): Promise<number> {
  if (listingIds.length === 0) return 0
  return db.execute(`DELETE FROM prices WHERE "listingId" IN (${placeholders(listingIds, 1)})`, listingIds)
}
