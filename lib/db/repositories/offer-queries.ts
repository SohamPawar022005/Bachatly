import type { RetailerOffer } from '@/lib/pricing/types'

/**
 * One shared SELECT fragment for "every current offer for a set of variants".
 *
 * The latest price row per listing is picked with a LATERAL join so the
 * `prices("listingId", "checkedAt" DESC)` index is used and no N+1 query is
 * needed. Retailers switched off by an admin are excluded here, so a disabled
 * retailer can never become "cheapest".
 */
export const OFFER_SELECT = `
  pl.id                    AS "listingId",
  pl."productVariantId"    AS "productVariantId",
  pl."retailerProductId"   AS "retailerProductId",
  pl."rawTitle"            AS "rawTitle",
  pl."productUrl"          AS "productUrl",
  pl."affiliateUrl"        AS "affiliateUrl",
  pl.availability          AS availability,
  pl."deliveryText"        AS "deliveryText",
  pl."deliveryDays"        AS "deliveryDays",
  pl."deliveryFee"         AS "listingDeliveryFee",
  pl.source                AS source,
  pl."lastCheckedAt"       AS "lastCheckedAt",
  pl."resolutionStatus"    AS "resolutionStatus",
  pl."matchConfidence"     AS "matchConfidence",
  r.id                     AS "retailerId",
  r.name                   AS "retailerName",
  r.slug                   AS "retailerSlug",
  r."logoUrl"              AS "retailerLogoUrl",
  r."brandColor"           AS "retailerBrandColor",
  pr.price                 AS price,
  pr.mrp                   AS mrp,
  pr.discount              AS discount,
  pr."deliveryFee"         AS "deliveryFee",
  pr."effectivePrice"      AS "effectivePrice",
  pr.currency              AS currency,
  pr."inStock"             AS "inStock",
  pr."checkedAt"           AS "checkedAt"
`

export const OFFER_FROM = `
  FROM product_listings pl
  JOIN retailers r ON r.id = pl."retailerId" AND r."isActive" = true
  LEFT JOIN LATERAL (
    SELECT p.price, p.mrp, p.discount, p."deliveryFee", p."effectivePrice", p.currency, p."inStock", p."checkedAt"
    FROM prices p
    WHERE p."listingId" = pl.id
    ORDER BY p."checkedAt" DESC, p.id DESC
    LIMIT 1
  ) pr ON true
`

export interface OfferRow {
  listingId: string
  productVariantId: string
  retailerProductId: string
  rawTitle: string
  productUrl: string
  affiliateUrl: string | null
  availability: RetailerOffer['availability']
  deliveryText: string | null
  deliveryDays: number | null
  listingDeliveryFee: number
  source: RetailerOffer['source']
  lastCheckedAt: Date | null
  resolutionStatus: 'RESOLVED' | 'PENDING' | 'UNMATCHED'
  matchConfidence: number
  retailerId: string
  retailerName: string
  retailerSlug: string
  retailerLogoUrl: string | null
  retailerBrandColor: string
  price: number | null
  mrp: number | null
  discount: number | null
  deliveryFee: number | null
  effectivePrice: number | null
  currency: string | null
  inStock: boolean | null
  checkedAt: Date | null
}

/** Maps a SQL row to the domain offer used by the comparison engine. */
export function mapOfferRow(row: OfferRow): RetailerOffer {
  const hasPrice = row.price !== null && row.price !== undefined
  // A listing whose delivery fee was never published reports fee 0 in the DB,
  // so we only treat it as "known" when the listing itself carries one.
  const deliveryFeeKnown = row.deliveryFee !== null && row.deliveryFee !== undefined
  return {
    listingId: row.listingId,
    productVariantId: row.productVariantId,
    retailerId: row.retailerId,
    retailerName: row.retailerName,
    retailerSlug: row.retailerSlug,
    retailerBrandColor: row.retailerBrandColor,
    logoUrl: row.retailerLogoUrl,
    productUrl: row.productUrl,
    affiliateUrl: row.affiliateUrl,
    price: hasPrice ? Number(row.price) : 0,
    mrp: row.mrp !== null ? Number(row.mrp) : hasPrice ? Number(row.price) : 0,
    discount: row.discount !== null ? Number(row.discount) : 0,
    deliveryFee: deliveryFeeKnown ? Number(row.deliveryFee) : 0,
    deliveryFeeKnown,
    effectivePrice: row.effectivePrice !== null ? Number(row.effectivePrice) : 0,
    availability: row.availability,
    deliveryText: row.deliveryText,
    deliveryDays: row.deliveryDays,
    inStock: row.inStock ?? true,
    checkedAt: row.checkedAt ?? row.lastCheckedAt ?? new Date(0),
    source: row.source,
    matchConfidence: row.matchConfidence,
    resolutionStatus: row.resolutionStatus,
  }
}
