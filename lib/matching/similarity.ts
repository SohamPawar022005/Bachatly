import { contentTokens, normalizeForMatching } from '@/lib/search/normalize'

/** Sørensen–Dice coefficient over character bigrams. Good at small typos. */
export function diceCoefficient(a: string, b: string): number {
  const sa = normalizeForMatching(a).replace(/\s+/g, '')
  const sb = normalizeForMatching(b).replace(/\s+/g, '')
  if (!sa || !sb) return 0
  if (sa === sb) return 1
  if (sa.length < 2 || sb.length < 2) return 0

  const bigrams = (s: string) => {
    const map = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2)
      map.set(bg, (map.get(bg) ?? 0) + 1)
    }
    return map
  }

  const mapA = bigrams(sa)
  const mapB = bigrams(sb)
  let intersection = 0
  for (const [bg, countA] of mapA) {
    const countB = mapB.get(bg) ?? 0
    intersection += Math.min(countA, countB)
  }
  const total = sa.length - 1 + (sb.length - 1)
  return total === 0 ? 0 : (2 * intersection) / total
}

/** Jaccard similarity over content tokens. Good at reordered / noisy titles. */
export function jaccardTokens(a: string, b: string): number {
  const ta = new Set(contentTokens(a))
  const tb = new Set(contentTokens(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  const union = ta.size + tb.size - shared
  return union === 0 ? 0 : shared / union
}

/**
 * Combined title similarity in [0, 1].
 * Weights token overlap higher (retailers reorder words a lot) and keeps the
 * character-level signal for typo tolerance.
 */
export function titleSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const jaccard = jaccardTokens(a, b)
  const dice = diceCoefficient(a, b)
  const combined = 0.6 * jaccard + 0.4 * dice
  return Math.round(Math.min(1, Math.max(0, combined)) * 1000) / 1000
}
