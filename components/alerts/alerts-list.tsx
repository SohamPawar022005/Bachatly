'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellOff, BellRing, CheckCircle2, Search, Trash2 } from 'lucide-react'
import Link from 'next/link'

import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { ProductImage } from '@/components/products/product-image'
import { useToast } from '@/components/ui/toast'
import { formatPrice } from '@/lib/utils/money'
import { relativeTime } from '@/lib/utils/time'
import type { UiAlert } from '@/lib/ui/types'
import { cn } from '@/lib/utils/cn'

const STATUS_VARIANT: Record<UiAlert['status'], 'success' | 'secondary' | 'muted' | 'outline'> = {
  TRIGGERED: 'success',
  WAITING: 'secondary',
  NO_PRICE: 'muted',
}

/** Price alerts with live distance-to-target, straight from the API. */
export function AlertsList() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get<{ items: UiAlert[] }>('/api/alerts'),
  })

  const remove = useMutation({
    mutationFn: (item: UiAlert) => api.delete<{ removed: boolean }>(`/api/alerts/${item.id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] })
      void queryClient.invalidateQueries({ queryKey: ['account'] })
      toast({ title: 'Alert deleted', variant: 'info' })
    },
    onError: (err: unknown) =>
      toast({ title: 'Could not delete alert', description: err instanceof Error ? err.message : undefined, variant: 'error' }),
  })

  if (isPending) {
    return (
      <div className="space-y-3">
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }
  if (isError) {
    return <ErrorState title="Could not load alerts" message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
  }

  const items = data?.items ?? []
  if (items.length === 0) {
    return (
      <EmptyState
        icon={BellRing}
        title="No price alerts yet"
        description="Open any product and set a target price. We re-check the retailer feeds on a schedule and notify you the moment it is met."
        action={
          <Button asChild>
            <Link href="/search">
              <Search className="size-4" aria-hidden />
              Browse products
            </Link>
          </Button>
        }
      />
    )
  }

  const active = items.filter((item) => item.isActive && item.status !== 'TRIGGERED')
  const triggered = items.filter((item) => item.status === 'TRIGGERED')

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {items.length} alert{items.length === 1 ? '' : 's'} · {active.length} watching · {triggered.length} triggered
      </p>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <Card className={cn(item.status === 'TRIGGERED' && 'border-success/40 bg-success/5')}>
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <Link href={`/products/${item.variantSlug}`} className="shrink-0">
                  <ProductImage
                    src={item.imageUrl}
                    alt={item.variantTitle}
                    fallbackLabel={item.brand}
                    className="size-14 rounded-lg"
                  />
                </Link>

                <div className="min-w-0 flex-1 space-y-1">
                  <Link href={`/products/${item.variantSlug}`} className="block">
                    <p className="truncate text-sm font-semibold hover:text-primary">{item.variantTitle}</p>
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {item.brand} · created {relativeTime(item.createdAt)}
                    {item.triggeredAt ? ` · triggered ${relativeTime(item.triggeredAt)}` : ''}
                  </p>
                  <p className="text-sm">
                    Alert below <strong className="font-semibold tabular-nums">{formatPrice(item.targetPrice)}</strong>
                    {item.currentPrice !== null ? (
                      <>
                        {' '}
                        · now{' '}
                        <strong className={cn('tabular-nums', item.currentPrice <= item.targetPrice ? 'text-success' : 'text-foreground')}>
                          {formatPrice(item.currentPrice)}
                        </strong>
                        {item.cheapestRetailerName ? ` at ${item.cheapestRetailerName}` : ''}
                      </>
                    ) : (
                      ' · no price available'
                    )}
                  </p>
                  {item.distance !== null && item.distance > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Needs to fall {formatPrice(item.distance)} more to trigger
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge variant={STATUS_VARIANT[item.status] ?? 'outline'}>
                    {item.status === 'TRIGGERED' ? <CheckCircle2 className="size-3" aria-hidden /> : null}
                    {item.status === 'TRIGGERED' ? 'Triggered' : item.status === 'WAITING' ? 'Watching' : 'No price data'}
                  </Badge>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/products/${item.variantSlug}`}>View</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete alert for ${item.variantTitle}`}
                      onClick={() => remove.mutate(item)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {items.length > 0 ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <BellOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Alerts are evaluated by the price-update job whenever a new price record is stored, so a trigger can take up to
          one job cycle after a retailer feed changes.
        </p>
      ) : null}
    </div>
  )
}
