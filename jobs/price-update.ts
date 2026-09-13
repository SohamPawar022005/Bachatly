import { appendPrice } from '@/lib/db/repositories/price-repository'
import { listListingsForRefresh, updateListingAvailability } from '@/lib/db/repositories/listing-repository'
import { finishJobRun, startJobRun } from '@/lib/db/repositories/stats-repository'
import { getAdapter } from '@/retailers'
import { refreshVariantRollups, refreshProductRollups } from '@/lib/db/repositories/product-repository'
import { checkAlerts } from '@/services/alert-service'
import { closePool } from '@/lib/db/pool'

/**
 * Background price update pipeline.
 *
 *   Scheduled job -> Retailer adapters -> Fetch data -> Normalize
 *     -> Product matching -> Update listings -> Create price record
 *     -> Recalculate cheapest price -> Check alerts -> Create notifications
 *
 * A single retailer failing never aborts the run: the listing keeps its last
 * known price and is reported as unavailable instead of corrupting the
 * comparison.
 */

export interface PriceUpdateOptions {
  limit?: number
  triggeredBy?: string
  /** 'random' uses each adapter's own jitter; 'drop'/'rise' force a movement. */
  simulateChange?: 'none' | 'random' | 'drop' | 'rise'
}

export interface PriceUpdateSummary {
  runId: string
  status: 'SUCCESS' | 'FAILED'
  listingsChecked: number
  priceRecordsCreated: number
  variantsUpdated: number
  alertsTriggered: number
  notificationsSent: number
  skipped: Array<{ listingId: string; reason: string }>
  startedAt: string
  finishedAt: string
  durationMs: number
}

function applySimulatedChange(price: number, mode: NonNullable<PriceUpdateOptions['simulateChange']>): number {
  if (mode === 'drop') return Math.max(1, Math.round((price * 0.9) / 100) * 100)
  if (mode === 'rise') return Math.round((price * 1.07) / 100) * 100
  return price
}

export async function runPriceUpdate(options: PriceUpdateOptions = {}): Promise<PriceUpdateSummary> {
  const triggeredBy = options.triggeredBy ?? 'schedule'
  const simulateChange = options.simulateChange ?? 'random'
  const startedAt = Date.now()
  const runId = (await startJobRun(triggeredBy)).id

  const listings = await listListingsForRefresh(options.limit)
  const skipped: Array<{ listingId: string; reason: string }> = []
  let priceRecordsCreated = 0
  const dirtyVariants = new Map<string, string>()

  for (const listing of listings) {
    const adapter = getAdapter(listing.retailerSlug)
    if (!adapter) {
      skipped.push({ listingId: listing.id, reason: `No adapter registered for ${listing.retailerSlug}` })
      continue
    }
    try {
      const result = await adapter.getPrice(listing.retailerProductId)
      if (!result || result.price <= 0) {
        // Keep the last known price rather than writing a bogus one.
        skipped.push({ listingId: listing.id, reason: 'Retailer returned no usable price' })
        continue
      }
      const price = applySimulatedChange(result.price, simulateChange)
      await appendPrice({
        listingId: listing.id,
        price,
        mrp: result.mrp,
        deliveryFee: result.deliveryFee,
        deliveryFeeKnown: result.deliveryFeeKnown,
        inStock: result.availability !== 'OUT_OF_STOCK',
        currency: result.currency,
        checkedAt: result.fetchedAt,
      })
      priceRecordsCreated++
      await updateListingAvailability(listing.id, {
        availability: result.availability,
        deliveryText: result.deliveryText,
        lastCheckedAt: result.fetchedAt,
      })
      dirtyVariants.set(listing.productVariantId, listing.productId)
    } catch (error) {
      skipped.push({
        listingId: listing.id,
        reason: error instanceof Error ? error.message : 'Unknown adapter error',
      })
    }
  }

  for (const [variantId, productId] of dirtyVariants) {
    await refreshVariantRollups(variantId)
    await refreshProductRollups(productId)
  }

  const alerts = await checkAlerts()

  await finishJobRun(runId, {
    status: 'SUCCESS',
    listingsChecked: listings.length,
    priceRecordsCreated,
    alertsTriggered: alerts.triggered,
    notificationsSent: alerts.notified,
  })

  return {
    runId,
    status: 'SUCCESS',
    listingsChecked: listings.length,
    priceRecordsCreated,
    variantsUpdated: dirtyVariants.size,
    alertsTriggered: alerts.triggered,
    notificationsSent: alerts.notified,
    skipped,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  }
}

/** CLI entry (used by `pnpm jobs:price-update`). */
export async function runPriceUpdateAndExit(options: PriceUpdateOptions = {}) {
  try {
    const summary = await runPriceUpdate(options)
    console.log(
      `Price update ${summary.status}: ${summary.listingsChecked} listings checked, ${summary.priceRecordsCreated} price records, ${summary.variantsUpdated} variants refreshed, ${summary.alertsTriggered} alerts triggered (${summary.durationMs}ms)`,
    )
    if (summary.skipped.length) {
      console.log(`  skipped ${summary.skipped.length}: ${summary.skipped.slice(0, 3).map((s) => s.reason).join('; ')}`)
    }
  } finally {
    await closePool()
  }
}
