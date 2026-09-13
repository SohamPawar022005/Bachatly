import { listOffersForVariant, refreshProductRollups, refreshVariantRollups } from '@/lib/db/repositories/product-repository'
import { priceHistoryForVariant } from '@/lib/db/repositories/price-repository'
import { compareOffers } from '@/lib/pricing/compare'
import { classifyPrice } from '@/lib/pricing/classify'
import type { ComparisonResult, PriceClassification, RetailerOffer } from '@/lib/pricing/types'
import { priceFreshnessLabel, DAY } from '@/lib/utils/time'

/**
 * Pricing service — the only place where offers become a comparison.
 *
 * Everything here is derived from stored price records at call time. There is
 * no hardcoded "cheapest retailer" anywhere: the cheapest is whichever offer
 * has the lowest effective price right now.
 */

export interface HistoryPoint {
  /** ISO date (UTC day). */
  date: string
  price: number
  retailer: string
  retailerSlug: string
}

export interface HistoryWindowStats {
  lowest: number | null
  highest: number | null
  average: number | null
  sampleSize: number
}

export interface PriceHistoryResult {
  days: number
  /** One series per retailer, oldest first. */
  series: Array<{
    retailer: string
    retailerSlug: string
    color: string
    points: HistoryPoint[]
  }>
  /** The cheapest available price for each day — the headline chart. */
  cheapestSeries: HistoryPoint[]
  stats: HistoryWindowStats
  windows: Record<'7' | '30' | '90', HistoryWindowStats>
  classification: PriceClassification
  freshness: { label: string; status: 'fresh' | 'stale' | 'unknown' | 'unavailable'; isStale: boolean; checkedAt: Date | null }
}

function dayKey(input: Date): string {
  return input.toISOString().slice(0, 10)
}

function windowStats(points: Array<{ price: number }>): HistoryWindowStats {
  if (points.length === 0) return { lowest: null, highest: null, average: null, sampleSize: 0 }
  const values = points.map((p) => p.price)
  const lowest = Math.min(...values)
  const highest = Math.max(...values)
  const average = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  return { lowest, highest, average, sampleSize: values.length }
}

export interface VariantPricing {
  comparison: ComparisonResult
  history: PriceHistoryResult
  offers: RetailerOffer[]
  isDemoData: boolean
}

/**
 * Full pricing view for one variant: current comparison + history + verdict.
 */
export async function getPricingForVariant(variantId: string, options: { days?: number } = {}): Promise<VariantPricing> {
  const days = options.days ?? 90
  const [offers, historyRows] = await Promise.all([listOffersForVariant(variantId), priceHistoryForVariant(variantId, { days })])

  const comparison = compareOffers(offers)

  // Group history by retailer.
  const byRetailer = new Map<string, HistoryPoint[]>()
  const byDay = new Map<string, number>()
  for (const row of historyRows) {
    const key = dayKey(row.checkedAt)
    const point: HistoryPoint = {
      date: key,
      price: row.effectivePrice,
      retailer: row.retailerName,
      retailerSlug: row.retailerSlug,
    }
    const list = byRetailer.get(row.retailerSlug)
    if (list) list.push(point)
    else byRetailer.set(row.retailerSlug, [point])
    const existing = byDay.get(key)
    if (existing === undefined || row.effectivePrice < existing) byDay.set(key, row.effectivePrice)
  }

  const retailerColors: Record<string, string> = {}
  for (const offer of offers) retailerColors[offer.retailerSlug] = offer.retailerBrandColor ?? '#111827'

  const series = [...byRetailer.entries()]
    .map(([slug, points]) => ({
      retailer: points[0]?.retailer ?? slug,
      retailerSlug: slug,
      color: retailerColors[slug] ?? '#111827',
      points: points.sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => a.retailer.localeCompare(b.retailer))

  const cheapestSeries: HistoryPoint[] = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, price]) => ({ date, price, retailer: 'Cheapest', retailerSlug: 'cheapest' }))

  const current = comparison.lowestPrice ?? cheapestSeries[cheapestSeries.length - 1]?.price ?? 0
  const classification = classifyPrice({ current, history: cheapestSeries.map((p) => p.price) })

  const cutoffs = {
    '7': 7 * DAY,
    '30': 30 * DAY,
    '90': 90 * DAY,
  } as const
  const now = Date.now()
  const windows = Object.fromEntries(
    (Object.keys(cutoffs) as Array<'7' | '30' | '90'>).map((key) => [
      key,
      windowStats(cheapestSeries.filter((p) => now - new Date(p.date).getTime() <= cutoffs[key])),
    ]),
  ) as Record<'7' | '30' | '90', HistoryWindowStats>

  const comparableCheckedAt = comparison.comparableOffers
    .map((o) => o.checkedAt)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => b.getTime() - a.getTime())
  const freshest = comparableCheckedAt[0] ?? null

  return {
    comparison,
    offers,
    isDemoData: offers.every((o) => o.source === 'DEMO'),
    history: {
      days,
      series,
      cheapestSeries,
      stats: windowStats(cheapestSeries),
      windows,
      classification,
      freshness: { ...priceFreshnessLabel(freshest), checkedAt: freshest },
    },
  }
}

/** Recompute and persist the denormalised rollups for a variant and its product. */
export async function refreshPricing(variantId: string, productId?: string): Promise<void> {
  await refreshVariantRollups(variantId)
  if (productId) await refreshProductRollups(productId)
}
