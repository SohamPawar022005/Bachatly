/**
 * Money handling.
 *
 * Every monetary amount in Bachatly is an INTEGER number of PAISE (1/100 ₹).
 * Integer money keeps discounts, delivery fees and savings exact and avoids
 * floating point drift in the comparison engine. Conversion to rupees happens
 * only at the presentation boundary.
 */

export const PAISE_PER_RUPEE = 100

export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * PAISE_PER_RUPEE)
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrFormatterWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Format paise as an Indian-locale rupee string, e.g. 6499900 -> "₹64,999". */
export function formatPrice(paise: number | null | undefined, currency = 'INR'): string {
  if (paise === null || paise === undefined || Number.isNaN(paise)) return 'Price unavailable'
  const rupees = paiseToRupees(paise)
  const hasPaise = Math.abs(rupees % 1) > 0.001
  if (currency === 'INR') {
    return hasPaise ? inrFormatterWithPaise.format(rupees) : inrFormatter.format(rupees)
  }
  return `${currency} ${rupees.toLocaleString('en-IN')}`
}

/** Compact formatting for dense UI, e.g. 6499900 -> "₹64,999", 12500000 -> "₹1.25L". */
export function formatCompactPrice(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '—'
  const rupees = paiseToRupees(paise)
  if (rupees >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(2)}Cr`
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(2)}L`
  return formatPrice(paise)
}

/**
 * Parses free-form user input ("64999", "64,999", "₹65k", "65000.50") into paise.
 * Returns null when the input is not a usable amount.
 */
export function parsePriceInput(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === 'number') return Number.isFinite(input) ? rupeesToPaise(input) : null
  const cleaned = input
    .replace(/[₹,\s]/g, '')
    .replace(/^rs\.?/i, '')
    .trim()
    .toLowerCase()
  if (!cleaned) return null
  const multiplier = /k$/.test(cleaned) ? 1000 : /l$/.test(cleaned) ? 100_000 : 1
  const numeric = Number(cleaned.replace(/[kl]$/, ''))
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return rupeesToPaise(numeric * multiplier)
}

export function discountPercent(price: number, mrp: number): number {
  if (!mrp || mrp <= 0) return 0
  const pct = ((mrp - price) / mrp) * 100
  return pct > 0 ? Math.round(pct * 10) / 10 : 0
}
