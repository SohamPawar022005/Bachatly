'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, HeartOff, Search, Trash2, TrendingDown } from 'lucide-react'
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
import type { UiFavorite } from '@/lib/ui/types'

/** Saved products, each with its live cheapest price. */
export function FavoritesList() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<{ items: UiFavorite[] }>('/api/favorites'),
  })

  const remove = useMutation({
    mutationFn: (item: UiFavorite) =>
      api.delete<{ removed: boolean }>(`/api/favorites/${item.id}?variantId=${encodeURIComponent(item.variantId)}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites'] })
      void queryClient.invalidateQueries({ queryKey: ['account'] })
      toast({ title: 'Removed from favourites', variant: 'info' })
    },
    onError: (err: unknown) =>
      toast({ title: 'Could not remove', description: err instanceof Error ? err.message : undefined, variant: 'error' }),
  })

  if (isPending) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    )
  }
  if (isError) {
    return <ErrorState title="Could not load favourites" message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
  }

  const items = data?.items ?? []
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No favourites yet"
        description="Save a product and we will keep tracking its price across every retailer we monitor."
        action={
          <Button asChild>
            <Link href="/search">
              <Search className="size-4" aria-hidden />
              Find a product
            </Link>
          </Button>
        }
      />
    )
  }

  const totalSavings = items.reduce((sum, item) => sum + (item.comparison.maximumSavings ?? 0), 0)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {items.length} saved product{items.length === 1 ? '' : 's'}
        {totalSavings > 0 ? (
          <>
            {' '}
            · up to <strong className="font-semibold text-success">{formatPrice(totalSavings)}</strong> available by
            picking the cheapest retailer
          </>
        ) : null}
      </p>

      <ul className="space-y-3">
        {items.map((item) => {
          const lowest = item.comparison.lowestPrice
          const highest = item.comparison.highestPrice
          return (
            <li key={item.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <Link href={`/products/${item.variantSlug}`} className="shrink-0">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.variantTitle}
                      fallbackLabel={item.brand}
                      className="size-16 rounded-lg sm:size-20"
                    />
                  </Link>

                  <div className="min-w-0 flex-1 space-y-1">
                    <Link href={`/products/${item.variantSlug}`} className="block">
                      <p className="truncate text-sm font-semibold hover:text-primary">{item.variantTitle}</p>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.brand}
                      {item.rating > 0 ? ` · ${item.rating.toFixed(1)}★` : ''} · saved {relativeTime(item.addedAt)}
                    </p>
                    {lowest !== null && highest !== null && highest > lowest ? (
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(lowest)} at {item.comparison.cheapestRetailer} · up to {formatPrice(highest)}
                        elsewhere
                      </p>
                    ) : (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HeartOff className="size-3" aria-hidden />
                        Price temporarily unavailable
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    {lowest !== null ? (
                      <p className="text-lg font-bold tabular-nums">{formatPrice(lowest)}</p>
                    ) : (
                      <Badge variant="muted">No price</Badge>
                    )}
                    {item.comparison.maximumSavings && item.comparison.maximumSavings > 0 ? (
                      <p className="flex items-center justify-end gap-1 text-xs font-medium text-success">
                        <TrendingDown className="size-3" aria-hidden />
                        save {formatPrice(item.comparison.maximumSavings)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/products/${item.variantSlug}`}>Compare</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${item.variantTitle} from favourites`}
                      onClick={() => remove.mutate(item)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
