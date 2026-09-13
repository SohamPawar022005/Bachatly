import type { Money } from '@/lib/db/types'

/**
 * Effective price calculation.
 *
 *   effectivePrice = price + deliveryFee - couponValue
 *
 * A component is only included when reliable data exists:
 *  - delivery fee is skipped when the retailer did not publish one
 *    (`deliveryFeeKnown === false`), so we never invent a delivery cost
 *  - a coupon is only applied when its minimum spend is satisfied
 *  - the result is clamped at 0
 *
 * `discount` is the retailer's own discount (mrp - price) and is already
 * reflected in `price`, so it is reported but NOT subtracted again — that would
 * double count and fabricate savings.
 */

export interface EffectivePriceInput {
  /** Selling price in paise (required). */
  price: Money
  /** List price in paise. */
  mrp?: Money | null
  /** Published delivery fee in paise. */
  deliveryFee?: Money | null
  /** Whether the delivery fee is actually known. Defaults to `deliveryFee != null`. */
  deliveryFeeKnown?: boolean
  /** Optional coupon: value in paise plus an optional minimum spend in paise. */
  coupon?: { value: Money; minSpend?: Money } | null
}

export interface EffectivePriceResult {
  price: Money
  mrp: Money
  discount: Money
  discountPercent: number
  deliveryFee: Money
  deliveryFeeIncluded: boolean
  couponValue: Money
  couponApplied: boolean
  effectivePrice: Money
  freeDelivery: boolean
}

export function calculateEffectivePrice(input: EffectivePriceInput): EffectivePriceResult {
  const price = Math.max(0, Math.round(input.price))
  const rawMrp = input.mrp === null || input.mrp === undefined ? null : Math.round(input.mrp)
  const mrp = rawMrp === null || rawMrp < price ? price : rawMrp
  const discount = Math.max(0, mrp - price)
  const discountPercent = mrp > 0 ? Math.round((discount / mrp) * 1000) / 10 : 0

  const deliveryFeeKnown =
    input.deliveryFeeKnown ?? (input.deliveryFee !== null && input.deliveryFee !== undefined)
  const deliveryFee = deliveryFeeKnown ? Math.max(0, Math.round(input.deliveryFee ?? 0)) : 0

  let couponValue = 0
  let couponApplied = false
  if (input.coupon && input.coupon.value > 0) {
    const minSpend = input.coupon.minSpend ?? 0
    if (price >= minSpend) {
      couponValue = Math.min(Math.round(input.coupon.value), price + deliveryFee)
      couponApplied = true
    }
  }

  const effectivePrice = Math.max(0, price + deliveryFee - couponValue)

  return {
    price,
    mrp,
    discount,
    discountPercent,
    deliveryFee,
    deliveryFeeIncluded: deliveryFeeKnown,
    couponValue,
    couponApplied,
    effectivePrice,
    freeDelivery: deliveryFeeKnown && deliveryFee === 0,
  }
}

/** Convenience: effective price only. */
export function effectivePriceOf(input: EffectivePriceInput): Money {
  return calculateEffectivePrice(input).effectivePrice
}
