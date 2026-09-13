import { contentTokens } from '@/lib/search/normalize'
import { titleSimilarity } from './similarity'
import {
  attributesFrom,
  normalizeBrand,
  normalizeColor,
  normalizeGtin,
  normalizeModelNumber,
  normalizeStorage,
  type ProductAttributes,
} from './attributes'

/**
 * Product identity resolution — the scoring engine.
 *
 * Retailers describe the same physical product differently:
 *   Amazon:   "Apple iPhone 16 128GB Black"
 *   Flipkart: "Apple iPhone16 - Black, 128 GB"
 *   Croma:    "iPhone 16 128 GB - Black"
 *
 * Each signal contributes a fixed number of points. Conflicting hard
 * attributes (different storage, different colour) subtract points and can veto
 * an automatic merge entirely — merging two different variants would corrupt
 * every price comparison built on top of them.
 */

export const MATCH_WEIGHTS = {
  /** Exact GTIN/EAN/UPC match is conclusive. */
  gtin: 100,
  modelNumber: 40,
  /**
   * Core model phrase present, e.g. "iphone 16" inside a noisy marketplace
   * title. Scaled by the fraction of core tokens found. This is the signal that
   * lets a keyword-stuffed listing still be recognised.
   */
  coreModelPhrase: 35,
  brand: 30,
  storage: 15,
  color: 10,
  /** Scaled by titleSimilarity() in [0, 1]. */
  title: 20,
  /** Matching apparel/footwear size. */
  size: 5,
} as const

export const MATCH_PENALTIES = {
  storageConflict: 25,
  colorConflict: 15,
  sizeConflict: 15,
} as const

export const MATCH_THRESHOLDS = {
  /** At or above this score the listing is merged automatically. */
  autoMerge: 70,
  /** Between review and autoMerge the listing is queued for human review. */
  review: 45,
} as const

/**
 * Words that mark a listing as an accessory rather than the product itself
 * ("iPhone 16 case"). Their presence is a hard conflict: the model phrase can
 * match perfectly while the item being sold is a different thing.
 */
export const ACCESSORY_INDICATORS = new Set([
  'case', 'cover', 'sleeve', 'pouch', 'protector', 'guard', 'strap', 'band', 'cable',
  'adapter', 'replacement', 'skin', 'tempered', 'backpanel', 'back panel', 'holder',
  'stand', 'mount', 'sticker',
])

export type MatchDecision = 'AUTO_MERGE' | 'REVIEW' | 'REJECT'

export interface MatchBreakdownEntry {
  signal: keyof typeof MATCH_WEIGHTS | 'penalty'
  label: string
  points: number
  detail: string
}

export interface MatchScoreResult {
  score: number
  decision: MatchDecision
  breakdown: MatchBreakdownEntry[]
  /** Hard conflicts that block an automatic merge regardless of score. */
  conflicts: string[]
}

export interface MatchCandidate extends Partial<ProductAttributes> {
  title: string
}

function push(entries: MatchBreakdownEntry[], entry: MatchBreakdownEntry) {
  if (entry.points !== 0 || entry.detail) entries.push(entry)
}

export function scoreMatch(candidate: MatchCandidate, target: MatchCandidate): MatchScoreResult {
  const a = attributesFrom(candidate)
  const b = attributesFrom(target)
  const breakdown: MatchBreakdownEntry[] = []
  const conflicts: string[] = []
  let score = 0
  let positiveAttributeMatches = 0

  // 1. GTIN — conclusive on its own.
  const gtinA = normalizeGtin(a.gtin)
  const gtinB = normalizeGtin(b.gtin)
  if (gtinA && gtinB) {
    if (gtinA === gtinB) {
      push(breakdown, { signal: 'gtin', label: 'GTIN match', points: MATCH_WEIGHTS.gtin, detail: gtinA })
      return {
        score: 100,
        decision: 'AUTO_MERGE',
        breakdown,
        conflicts: [],
      }
    }
    push(breakdown, {
      signal: 'penalty',
      label: 'GTIN conflict',
      points: -MATCH_WEIGHTS.gtin,
      detail: `${gtinA} != ${gtinB}`,
    })
    conflicts.push('gtin')
    score -= MATCH_WEIGHTS.gtin
  }

  // 2. Model number.
  const modelA = normalizeModelNumber(a.modelNumber)
  const modelB = normalizeModelNumber(b.modelNumber)
  if (modelA && modelB) {
    if (modelA === modelB) {
      push(breakdown, { signal: 'modelNumber', label: 'Model number match', points: MATCH_WEIGHTS.modelNumber, detail: modelA })
      score += MATCH_WEIGHTS.modelNumber
      positiveAttributeMatches += 1
    } else {
      push(breakdown, { signal: 'penalty', label: 'Model number conflict', points: -20, detail: `${modelA} != ${modelB}` })
      conflicts.push('modelNumber')
      score -= 20
    }
  }

  // 3. Brand.
  const brandA = normalizeBrand(a.brand)
  const brandB = normalizeBrand(b.brand)
  if (brandA && brandB) {
    if (brandA === brandB) {
      push(breakdown, { signal: 'brand', label: 'Brand match', points: MATCH_WEIGHTS.brand, detail: brandA })
      score += MATCH_WEIGHTS.brand
    } else {
      push(breakdown, { signal: 'penalty', label: 'Brand conflict', points: -MATCH_WEIGHTS.brand, detail: `${brandA} != ${brandB}` })
      conflicts.push('brand')
      score -= MATCH_WEIGHTS.brand
    }
  }

  // 4. Storage (critical variant dimension).
  const storageA = normalizeStorage(a.storage)
  const storageB = normalizeStorage(b.storage)
  if (storageA && storageB) {
    if (storageA === storageB) {
      push(breakdown, { signal: 'storage', label: 'Storage match', points: MATCH_WEIGHTS.storage, detail: storageA })
      score += MATCH_WEIGHTS.storage
      positiveAttributeMatches += 1
    } else {
      push(breakdown, {
        signal: 'penalty',
        label: 'Storage conflict',
        points: -MATCH_PENALTIES.storageConflict,
        detail: `${storageA} != ${storageB}`,
      })
      conflicts.push('storage')
      score -= MATCH_PENALTIES.storageConflict
    }
  }

  // 5. Colour.
  const colorA = normalizeColor(a.color)
  const colorB = normalizeColor(b.color)
  if (colorA && colorB) {
    if (colorA === colorB) {
      push(breakdown, { signal: 'color', label: 'Colour match', points: MATCH_WEIGHTS.color, detail: colorA })
      score += MATCH_WEIGHTS.color
      positiveAttributeMatches += 1
    } else {
      push(breakdown, {
        signal: 'penalty',
        label: 'Colour conflict',
        points: -MATCH_PENALTIES.colorConflict,
        detail: `${colorA} != ${colorB}`,
      })
      conflicts.push('color')
      score -= MATCH_PENALTIES.colorConflict
    }
  }

  // 6. Size (apparel / footwear).
  const sizeA = a.size?.toLowerCase() ?? null
  const sizeB = b.size?.toLowerCase() ?? null
  if (sizeA && sizeB) {
    if (sizeA === sizeB) {
      push(breakdown, { signal: 'size', label: 'Size match', points: MATCH_WEIGHTS.size, detail: sizeA })
      score += MATCH_WEIGHTS.size
      positiveAttributeMatches += 1
    } else {
      push(breakdown, {
        signal: 'penalty',
        label: 'Size conflict',
        points: -MATCH_PENALTIES.sizeConflict,
        detail: `${sizeA} != ${sizeB}`,
      })
      conflicts.push('size')
      score -= MATCH_PENALTIES.sizeConflict
    }
  }

  // 7. Core model phrase: the product-name tokens of the canonical record
  //    (brand, colour, storage and size removed) found inside the candidate.
  const attributeTokens = new Set<string>()
  if (b.storage) attributeTokens.add(b.storage.toLowerCase())
  if (b.color) for (const token of b.color.toLowerCase().split(/\s+/)) attributeTokens.add(token)
  if (b.size) attributeTokens.add(b.size.toLowerCase())
  const brandTokens = b.brand ? b.brand.toLowerCase().split(/\s+/) : []
  const coreTokens = contentTokens(target.title ?? '').filter(
    (token) => !attributeTokens.has(token) && !brandTokens.includes(token) && token.length > 1,
  )
  let coreComplete = false
  if (coreTokens.length > 0) {
    const phraseTokens = new Set(contentTokens(candidate.title ?? ''))
    const hits = coreTokens.filter((token) => phraseTokens.has(token)).length
    const ratio = hits / coreTokens.length
    coreComplete = ratio === 1
    const corePoints = Math.round(MATCH_WEIGHTS.coreModelPhrase * ratio)
    push(breakdown, {
      signal: 'coreModelPhrase',
      label: 'Core model phrase',
      points: corePoints,
      detail: `${hits}/${coreTokens.length} core tokens present`,
    })
    score += corePoints
  }

  // 8. Normalised title similarity.
  const similarity = titleSimilarity(candidate.title ?? '', target.title ?? '')
  const titlePoints = Math.round(MATCH_WEIGHTS.title * similarity)
  push(breakdown, {
    signal: 'title',
    label: 'Title similarity',
    points: titlePoints,
    detail: `${Math.round(similarity * 100)}% similar`,
  })
  score += titlePoints

  // 9. Accessory guard: a case/cover/strap listing is not the device itself.
  const candidateTokens = new Set(contentTokens(candidate.title ?? ''))
  const accessoryHits = [...candidateTokens].filter((token) => ACCESSORY_INDICATORS.has(token))
  if (accessoryHits.length > 0) {
    const penalty = -40
    push(breakdown, {
      signal: 'penalty',
      label: 'Accessory indicator',
      points: penalty,
      detail: accessoryHits.join(', '),
    })
    score += penalty
    conflicts.push('accessory')
  }

  score = Math.max(0, Math.min(100, score))

  // A listing whose brand token we simply do not recognise can still be merged
  // when the *whole* model phrase is present, no attribute conflicts and at
  // least one distinguishing attribute agrees. Marketplace feeds (Meesho and
  // similar) routinely omit the brand from the title.
  const conclusiveWithoutBrand =
    coreComplete && conflicts.length === 0 && positiveAttributeMatches >= 1

  let decision: MatchDecision
  if (conflicts.length > 0 && conflicts.includes('accessory')) {
    decision = 'REJECT'
  } else if (score >= MATCH_THRESHOLDS.autoMerge && conflicts.length === 0) {
    decision = 'AUTO_MERGE'
  } else if (conclusiveWithoutBrand) {
    decision = 'AUTO_MERGE'
  } else if (score >= MATCH_THRESHOLDS.review && !conflicts.includes('storage') && !conflicts.includes('gtin')) {
    decision = 'REVIEW'
  } else {
    decision = 'REJECT'
  }

  return { score, decision, breakdown, conflicts }
}

/** Convenience helper used by jobs and tests. */
export function isMergeable(result: MatchScoreResult): boolean {
  return result.decision === 'AUTO_MERGE'
}
