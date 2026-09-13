import type { PriceClassification, PriceVerdict } from './types'

/**
 * Price classification against stored history.
 *
 * The verdict is computed from actual stored price records — never from a
 * hardcoded rule like "below X is great". Two signals are combined:
 *
 *   1. position within the observed range   (current - lowest) / (highest - lowest)
 *   2. distance from the historical average  (current - average) / average
 *
 * Thresholds are explicit constants so they can be tuned and unit tested.
 */

export const CLASSIFICATION_THRESHOLDS = {
  /** Minimum number of price records before the verdict is treated as reliable. */
  minSampleSize: 3,
  /** Range position at or below which a price is a strong buy. */
  greatRangePosition: 0.15,
  /** Range position at or below which a price is good. */
  goodRangePosition: 0.4,
  /** Range position at or above which a price is high. */
  highRangePosition: 0.85,
  /** Percentage below the average that counts as "great". */
  greatVsAverage: -8,
  /** Percentage below the average that counts as "good". */
  goodVsAverage: -2,
  /** Percentage above the average that counts as "high". */
  highVsAverage: 6,
} as const

export const VERDICT_META: Record<PriceVerdict, { label: string; emoji: string }> = {
  GREAT: { label: 'Great Price', emoji: '🔥' },
  GOOD: { label: 'Good Price', emoji: '✓' },
  AVERAGE: { label: 'Average Price', emoji: '→' },
  HIGH: { label: 'High Price', emoji: '⚠' },
}

export interface ClassifyInput {
  /** Current effective price in paise. */
  current: number
  /** Historical effective prices in paise (any order). */
  history: readonly number[]
}

export function classifyPrice(input: ClassifyInput): PriceClassification {
  const history = input.history.filter((p) => Number.isFinite(p) && p > 0)
  const current = input.current

  if (history.length === 0 || current <= 0) {
    return {
      verdict: 'AVERAGE',
      label: VERDICT_META.AVERAGE.label,
      vsAveragePercent: 0,
      current,
      lowest: current,
      highest: current,
      average: current,
      sampleSize: history.length,
      confidence: 'low',
      reason: 'Not enough price history yet to judge this price.',
    }
  }

  const lowest = Math.min(...history, current)
  const highest = Math.max(...history, current)
  const average = Math.round(history.reduce((a, b) => a + b, 0) / history.length)
  const vsAveragePercent = average > 0 ? Math.round(((current - average) / average) * 1000) / 10 : 0
  const range = highest - lowest
  const rangePosition = range > 0 ? (current - lowest) / range : 0.5

  const t = CLASSIFICATION_THRESHOLDS
  let verdict: PriceVerdict
  let reason: string

  if (range === 0) {
    verdict = 'AVERAGE'
    reason = 'This price has not moved — it is sitting exactly at its historical level.'
  } else if (rangePosition <= t.greatRangePosition && vsAveragePercent < 0) {
    verdict = 'GREAT'
    reason = `At or near the lowest recorded price and ${Math.abs(vsAveragePercent)}% below the historical average.`
  } else if (vsAveragePercent <= t.greatVsAverage && rangePosition <= t.goodRangePosition) {
    verdict = 'GREAT'
    reason = `${Math.abs(vsAveragePercent)}% below the historical average — one of the lowest prices recorded.`
  } else if (rangePosition >= t.highRangePosition && vsAveragePercent > 0) {
    verdict = 'HIGH'
    reason = `At or near the highest recorded price and ${vsAveragePercent}% above the historical average.`
  } else if (vsAveragePercent >= t.highVsAverage && rangePosition >= 0.5) {
    verdict = 'HIGH'
    reason = `${vsAveragePercent}% above the historical average.`
  } else if (rangePosition <= t.goodRangePosition || vsAveragePercent <= t.goodVsAverage) {
    verdict = 'GOOD'
    reason =
      vsAveragePercent < 0
        ? `${Math.abs(vsAveragePercent)}% below the historical average.`
        : 'In the lower part of its recorded price range.'
  } else {
    verdict = 'AVERAGE'
    reason = `Close to the historical average of its recorded prices.`
  }

  const confidence = history.length >= 12 ? 'high' : history.length >= t.minSampleSize ? 'medium' : 'low'

  return {
    verdict,
    label: VERDICT_META[verdict].label,
    vsAveragePercent,
    current,
    lowest,
    highest,
    average,
    sampleSize: history.length,
    confidence,
    reason,
  }
}

export function verdictEmoji(verdict: PriceVerdict): string {
  return VERDICT_META[verdict].emoji
}
