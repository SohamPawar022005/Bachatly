import {
  createAlert,
  deleteAlert,
  findAlert,
  listAlerts,
  listTriggerableAlerts,
  markAlertTriggered,
  type PriceAlertWithProduct,
} from '@/lib/db/repositories/alert-repository'
import { findVariantById } from '@/lib/db/repositories/product-repository'
import { ERROR_CODES, notFound } from '@/lib/api/errors'
import { notify, priceDropNotification } from './notification-service'
import { formatPrice } from '@/lib/utils/money'

/**
 * Price alerts.
 *
 * A user asks "tell me when this drops below ₹60,000". The alert job compares
 * the stored cheapest price against the target and raises a notification the
 * first time the target is met (it will not spam the same price level twice).
 */

export interface AlertView {
  id: string
  variantId: string
  variantSlug: string
  variantTitle: string
  title: string
  slug: string
  brand: string
  imageUrl: string | null
  targetPrice: number
  currentPrice: number | null
  cheapestRetailerName: string | null
  isActive: boolean
  status: 'TRIGGERED' | 'WAITING' | 'NO_PRICE'
  /** How far the current price is from the target, in paise (negative = already below). */
  distance: number | null
  triggeredAt: string | null
  createdAt: string
}

function mapAlert(row: PriceAlertWithProduct): AlertView {
  const current = row.currentPrice
  const status: AlertView['status'] = row.triggeredAt ? 'TRIGGERED' : current === null ? 'NO_PRICE' : 'WAITING'
  return {
    id: row.id,
    variantId: row.productVariantId,
    variantSlug: row.variantSlug,
    variantTitle: row.variantTitle,
    title: row.productTitle,
    slug: row.productSlug,
    brand: row.brand,
    imageUrl: row.imageUrl,
    targetPrice: row.targetPrice,
    currentPrice: current,
    cheapestRetailerName: row.cheapestRetailerName,
    isActive: row.isActive,
    status,
    distance: current === null ? null : current - row.targetPrice,
    triggeredAt: row.triggeredAt ? new Date(row.triggeredAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

export async function createUserAlert(userId: string, input: { productVariantId: string; targetPrice: number }) {
  const variant = await findVariantById(input.productVariantId)
  if (!variant) throw notFound('Product variant', ERROR_CODES.VARIANT_NOT_FOUND)
  if (input.targetPrice <= 0) throw notFound('Target price', ERROR_CODES.VALIDATION_ERROR)

  const { row, created } = await createAlert({
    userId,
    productVariantId: input.productVariantId,
    targetPrice: input.targetPrice,
  })

  const current = variant.lowestPrice
  const alreadyBelow = current !== null && current <= input.targetPrice
  if (alreadyBelow && current !== null) {
    // The price is already at or below the target — tell the user immediately
    // rather than waiting for the next job run.
    const copy = priceDropNotification({
      productTitle: variant.productTitle,
      variantTitle: variant.title,
      currentPrice: current,
      targetPrice: input.targetPrice,
      retailerName: variant.cheapestRetailerName,
      variantSlug: variant.slug,
    })
    await notify({ userId, type: 'ALERT_TRIGGERED', ...copy, metadata: { variantId: variant.id, targetPrice: input.targetPrice, currentPrice: current } })
    await markAlertTriggered(row.id, current)
  }

  return { alert: mapAlert((await listAlerts(userId)).find((a) => a.id === row.id)!), created, alreadyBelow }
}

export async function listUserAlerts(userId: string): Promise<AlertView[]> {
  const rows = await listAlerts(userId)
  return rows.map(mapAlert)
}

export async function deleteUserAlert(userId: string, id: string): Promise<boolean> {
  const existing = await findAlert(id, userId)
  if (!existing) throw notFound('Price alert', ERROR_CODES.ALERT_NOT_FOUND)
  return deleteAlert(id, userId)
}

export interface AlertCheckResult {
  checked: number
  triggered: number
  notified: number
}

/**
 * Evaluates every active alert against current prices. Called by the alert job
 * and by the admin "check alerts" action.
 */
export async function checkAlerts(limit = 500): Promise<AlertCheckResult> {
  const triggerable = await listTriggerableAlerts(limit)
  let notified = 0

  for (const alert of triggerable) {
    const copy = priceDropNotification({
      productTitle: alert.productTitle,
      variantTitle: alert.variantTitle,
      currentPrice: alert.currentPrice,
      targetPrice: alert.targetPrice,
      retailerName: alert.cheapestRetailerName,
      variantSlug: alert.variantSlug,
    })
    const result = await notify({
      userId: alert.userId,
      type: 'ALERT_TRIGGERED',
      title: copy.title,
      message: copy.message,
      link: copy.link,
      email: true,
      metadata: {
        variantId: alert.productVariantId,
        targetPrice: alert.targetPrice,
        currentPrice: alert.currentPrice,
      },
    })
    await markAlertTriggered(alert.id, alert.currentPrice)
    if (result.id) notified++
  }

  return { checked: triggerable.length, triggered: triggerable.length, notified }
}

export function describeAlertStatus(alert: AlertView): string {
  if (alert.status === 'TRIGGERED') return 'Triggered'
  if (alert.status === 'NO_PRICE') return 'No price available'
  if (alert.distance === null) return 'Waiting'
  return `Waiting — ${formatPrice(Math.abs(alert.distance))} ${alert.distance > 0 ? 'above' : 'below'} target`
}
