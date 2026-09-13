'use client'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink, PackageX, RefreshCw, TrendingDown } from 'lucide-react'

import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { DemoDataBadge, DiscountBadge, FreeDeliveryBadge, LowestPriceBadge, SavingsBadge } from '@/components/badges'
import { Freshness } from '@/components/freshness'
import { RetailerLogo } from '@/components/retailers/retailer-logo'
import { formatPrice } from '@/lib/utils/money'
import type { UiOffer, UiPricesResponse } from '@/lib/ui/types'
import { cn } from '@/lib/utils/cn'

const AVAILABILITY_LABEL: Record<string, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Few left',
  OUT_OF_STOCK: 'Out of stock',
  PREORDER: 'Pre-order',
  UNKNOWN: 'Availability unknown',
}

/**
 * The retailer comparison table.
 *
 * Data comes from GET /api/products/:slug/prices, which computes the cheapest
 * offer from stored price records on every request — nothing is hardcoded here.
 */
export function PriceComparison({ variantSlug }: { variantSlug: string }) {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['prices', variantSlug],
    queryFn: () => api.get<UiPricesResponse>(`/api/products/${variantSlug}/prices`),
  })

  if (isPending) return <ComparisonSkeleton />
  if (isError) {
    return (
      <ErrorState
        title="Prices could not be loaded"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    )
  }
  if (!data || data.offers.length === 0) {
    return (
      <EmptyState
        icon={PackageX}
        title="No comparable prices yet"
        description="No retailer listing for this variant has a resolved, in-stock price right now. We re-check feeds on a schedule — try again shortly."
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw />
            Check again
          </Button>
        }
      />
    )
  }

  const cheapest = data.offers[0]
  const mostExpensive = data.offers[data.offers.length - 1]
  const spread = mostExpensive && cheapest ? mostExpensive.effectivePrice - cheapest.effectivePrice : 0

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">
            Compare {data.offers.length} retailer{data.offers.length === 1 ? '' : 's'}
          </CardTitle>
          <CardDescription>
            {cheapest ? (
              <>
                Cheapest right now:{' '}
                <span className="font-semibold text-success">
                  {formatPrice(cheapest.effectivePrice)} at {cheapest.retailer}
                </span>
              </>
            ) : (
                'No comparable offer available'
              )}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.isDemoData ? <DemoDataBadge /> : null}
          {isFetching ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="size-3 animate-spin" aria-hidden />
              refreshing
            </span>
          ) : null}
        </div>
      </CardHeader>

      {spread > 0 ? (
        <div className="mx-5 mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-success/10 px-4 py-3 text-sm">
          <TrendingDown className="size-4 shrink-0 text-success" aria-hidden />
          <span>
            Choosing the cheapest retailer over the most expensive one saves{' '}
            <strong className="font-semibold text-success">{formatPrice(spread)}</strong> on this product today.
          </span>
        </div>
      ) : null}

      <CardContent className="space-y-3">
        <ul className="space-y-3">
          {data.offers.map((offer) => (
            <OfferRow key={offer.listingId} offer={offer} />
          ))}
        </ul>

        {data.excluded.length > 0 ? (
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Not comparable right now
            </p>
            <ul className="space-y-2">
              {data.excluded.map((item) => (
                <li key={item.listingId} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <PackageX className="size-3.5" aria-hidden />
                  <span className="font-medium text-foreground">{item.retailer}</span>
                  <span>— {item.reason}</span>
                  <Freshness checkedAt={item.checkedAt} className="ml-auto" />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function OfferRow({ offer }: { offer: UiOffer }) {
  return (
    <li
      className={cn(
        'rounded-xl border p-3 transition-colors sm:p-4',
        offer.isCheapest ? 'border-success/50 bg-success/6' : 'border-border bg-card',
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <RetailerLogo name={offer.retailer} brandColor={offer.brandColor} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{offer.retailer}</span>
            {offer.isCheapest ? <LowestPriceBadge /> : null}
            {offer.discount >= 10 ? <DiscountBadge percent={offer.discount} /> : null}
            {offer.deliveryFee === 0 ? <FreeDeliveryBadge /> : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{AVAILABILITY_LABEL[offer.availability] ?? offer.availability}</span>
            {offer.deliveryText ? <span>{offer.deliveryText}</span> : null}
            {offer.deliveryFee === null ? <span>Delivery fee not published</span> : null}
            <Freshness checkedAt={offer.checkedAt} />
          </div>
        </div>

        <div className="ml-auto text-right">
          <div className="flex items-baseline justify-end gap-2">
            {offer.mrp && offer.mrp > offer.price ? (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(offer.mrp)}</span>
            ) : null}
            <span
              className={cn(
                'text-xl font-bold tabular-nums',
                offer.isCheapest ? 'text-success' : 'text-foreground',
              )}
            >
              {formatPrice(offer.effectivePrice)}
            </span>
          </div>
          {offer.deliveryFee !== null && offer.deliveryFee > 0 ? (
            <p className="text-xs text-muted-foreground">incl. {formatPrice(offer.deliveryFee)} delivery</p>
          ) : offer.deliveryFee === null ? (
            <p className="text-xs text-muted-foreground">delivery not included</p>
          ) : (
            <p className="text-xs text-muted-foreground">free delivery</p>
          )}
          {!offer.isCheapest && offer.extraCostVsCheapest > 0 ? (
            <p className="text-xs font-medium text-muted-foreground">
              {formatPrice(offer.extraCostVsCheapest)} more than cheapest
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {offer.buy.available && offer.buy.url ? (
          <Button asChild size="sm" variant={offer.isCheapest ? 'success' : 'outline'}>
            <a href={offer.buy.url} target="_blank" rel={offer.externalLinkRel}>
              Buy at {offer.retailer}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled title={offer.buy.reason ?? 'Retailer link unavailable'}>
            <PackageX className="size-3.5" aria-hidden />
            {offer.buy.reason ?? 'Retailer link unavailable'}
          </Button>
        )}
        {offer.isCheapest ? (
          <SavingsBadge amount={offer.extraCostVsCheapest > 0 ? offer.extraCostVsCheapest : 0} />
        ) : null}
      </div>
    </li>
  )
}

function ComparisonSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl border border-border p-4">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
