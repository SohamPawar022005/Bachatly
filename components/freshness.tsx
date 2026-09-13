import { Clock, TriangleAlert } from 'lucide-react'

import { relativeTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'

const STALE_AFTER_MS = 6 * 60 * 60 * 1000

/**
 * Shows when a price was last checked. A stale price is flagged rather than
 * silently presented as current.
 */
export function Freshness({ checkedAt, className }: { checkedAt: Date | string | null; className?: string }) {
  if (!checkedAt) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <TriangleAlert className="size-3" aria-hidden />
        Price not checked yet
      </span>
    )
  }
  const time = new Date(checkedAt).getTime()
  const stale = Date.now() - time > STALE_AFTER_MS
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs', stale ? 'text-warning-foreground' : 'text-muted-foreground', className)}
      title={`Last checked ${new Date(checkedAt).toLocaleString('en-IN')}`}
    >
      <Clock className="size-3" aria-hidden />
      {stale ? 'Checked ' : 'Updated '}
      {relativeTime(checkedAt)}
    </span>
  )
}
