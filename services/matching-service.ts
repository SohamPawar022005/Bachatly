import { scoreMatch, MATCH_THRESHOLDS, type MatchBreakdownEntry } from '@/lib/matching/score'
import { findListingsByIds, listListingsForVariant } from '@/lib/db/repositories/listing-repository'
import { recordIdentityMatch } from '@/lib/db/repositories/stats-repository'
import { db } from '@/lib/db/client'

/**
 * Identity resolution service.
 *
 * Retailer Listing -> Identity Resolution -> Bachatly Product -> Product Variant -> Price
 *
 * A listing may only compete on price once it is RESOLVED to a canonical
 * variant. Anything else stays out of the comparison and shows up in the admin
 * review queue with its score breakdown.
 */

export interface ResolutionCandidate {
  id: string
  brand: string
  productTitle: string
  variantTitle: string
  storage: string | null
  color: string | null
  size: string | null
  modelNumber: string | null
  gtin: string | null
}

export interface ResolutionResult {
  variantId: string | null
  status: 'RESOLVED' | 'PENDING' | 'UNMATCHED'
  score: number
  decision: 'AUTO_MERGE' | 'REVIEW' | 'REJECT'
  conflicts: string[]
  breakdown: MatchBreakdownEntry[]
}

export function canonicalTitle(candidate: ResolutionCandidate): string {
  return [candidate.brand, candidate.productTitle, candidate.storage, candidate.color, candidate.size]
    .filter((part): part is string => Boolean(part))
    .join(' ')
}

export function resolveAgainstCandidates(rawTitle: string, candidates: ResolutionCandidate[]): ResolutionResult {
  let best: { candidate: ResolutionCandidate; score: number; decision: 'AUTO_MERGE' | 'REVIEW' | 'REJECT'; conflicts: string[]; breakdown: MatchBreakdownEntry[] } | null = null

  for (const candidate of candidates) {
    const result = scoreMatch({ title: rawTitle }, { title: canonicalTitle(candidate), brand: candidate.brand, storage: candidate.storage ?? undefined, color: candidate.color ?? undefined, size: candidate.size ?? undefined, modelNumber: candidate.modelNumber ?? undefined, gtin: candidate.gtin ?? undefined })
    if (!best || result.score > best.score) {
      best = { candidate, score: result.score, decision: result.decision, conflicts: result.conflicts, breakdown: result.breakdown }
    }
  }

  if (!best) {
    return { variantId: null, status: 'UNMATCHED', score: 0, decision: 'REJECT', conflicts: [], breakdown: [] }
  }

  const status: ResolutionResult['status'] =
    best.decision === 'AUTO_MERGE' ? 'RESOLVED' : best.decision === 'REVIEW' ? 'PENDING' : 'UNMATCHED'

  return {
    variantId: status === 'RESOLVED' ? best.candidate.id : null,
    status,
    score: best.score,
    decision: best.decision,
    conflicts: best.conflicts,
    breakdown: best.breakdown,
  }
}

export async function listResolutionCandidates(): Promise<ResolutionCandidate[]> {
  return db.query<ResolutionCandidate>(
    `SELECT v.id, p.brand AS brand, p.title AS "productTitle", v.title AS "variantTitle",
            v.storage, v.color, v.size, v."modelNumber", v.gtin
     FROM product_variants v JOIN products p ON p.id = v."productId"`,
  )
}

/** Re-run resolution for one listing and persist the outcome + audit row. */
export async function reResolveListing(listingId: string): Promise<ResolutionResult> {
  const [listing] = await findListingsByIds([listingId])
  if (!listing) throw new Error(`Listing ${listingId} not found`)
  const candidates = await listResolutionCandidates()
  const result = resolveAgainstCandidates(listing.rawTitle, candidates)

  await db.execute(
    `UPDATE product_listings SET "resolutionStatus" = $2, "matchConfidence" = $3,
        "productVariantId" = COALESCE($4, "productVariantId"), "updatedAt" = now()
     WHERE id = $1`,
    [listingId, result.status, result.score, result.variantId],
  )
  await recordIdentityMatch({
    listingId,
    productVariantId: result.variantId,
    rawTitle: listing.rawTitle,
    score: result.score,
    breakdown: result.breakdown,
    status: result.status === 'RESOLVED' ? 'ACCEPTED' : result.status === 'PENDING' ? 'PENDING' : 'REJECTED',
  })
  return result
}

export interface ReviewQueueItem {
  listingId: string
  rawTitle: string
  normalizedTitle: string
  retailerName: string
  retailerSlug: string
  score: number
  productTitle: string
  variantTitle: string
  variantSlug: string
  variantId: string
}

export async function listReviewQueue(limit = 50): Promise<ReviewQueueItem[]> {
  return db.query<ReviewQueueItem>(
    `SELECT pl.id AS "listingId", pl."rawTitle", pl."normalizedTitle", pl."matchConfidence" AS score,
            r.name AS "retailerName", r.slug AS "retailerSlug",
            p.title AS "productTitle", v.title AS "variantTitle", v.slug AS "variantSlug", v.id AS "variantId"
     FROM product_listings pl
     JOIN retailers r ON r.id = pl."retailerId"
     JOIN product_variants v ON v.id = pl."productVariantId"
     JOIN products p ON p.id = v."productId"
     WHERE pl."resolutionStatus" IN ('PENDING', 'UNMATCHED')
     ORDER BY pl."matchConfidence" DESC, pl."updatedAt" DESC
     LIMIT $1`,
    [limit],
  )
}

export async function listListingsForVariantForAdmin(variantId: string) {
  return listListingsForVariant(variantId)
}

export { MATCH_THRESHOLDS }
