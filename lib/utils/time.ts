/** Freshness helpers — prices must never be presented as fresher than they are. */

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** After this age a price is considered stale and labelled as such. */
export const STALE_AFTER_MS = 6 * HOUR
/** After this age a retailer is treated as unavailable rather than merely stale. */
export const UNAVAILABLE_AFTER_MS = 7 * DAY

export function relativeTime(input: Date | string | null | undefined, now = Date.now()): string {
  if (!input) return 'never'
  const then = new Date(input).getTime()
  if (Number.isNaN(then)) return 'never'
  const diff = Math.max(0, now - then)
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} minute${Math.floor(diff / MINUTE) === 1 ? '' : 's'} ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} hour${Math.floor(diff / HOUR) === 1 ? '' : 's'} ago`
  const days = Math.floor(diff / DAY)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function priceFreshnessLabel(checkedAt: Date | string | null | undefined, now = Date.now()) {
  if (!checkedAt) {
    return { label: 'Not checked yet', status: 'unknown' as const, isStale: true }
  }
  const then = new Date(checkedAt).getTime()
  const diff = now - then
  if (Number.isNaN(then)) return { label: 'Unknown freshness', status: 'unknown' as const, isStale: true }
  if (diff > UNAVAILABLE_AFTER_MS) {
    return { label: 'Last verified a long time ago', status: 'unavailable' as const, isStale: true }
  }
  const label = `Price checked ${relativeTime(checkedAt, now)}`
  return {
    label,
    status: diff > STALE_AFTER_MS ? ('stale' as const) : ('fresh' as const),
    isStale: diff > STALE_AFTER_MS,
  }
}

export function startOfUtcDay(input: Date | string | number = new Date()): Date {
  const d = new Date(input)
  d.setUTCHours(0, 0, 0, 0)
  return d
}
