import Link from 'next/link'
import { Star, Store } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductImage } from '@/components/products/product-image'
import { FavoriteButton } from '@/components/favorite/favorite-button'
import { DiscountBadge, SavingsBadge } from '@/components/badges'
import { formatPrice } from '@/lib/utils/money'

export interface ProductCardData {
  variantSlug: string
  variantId: string
  variantTitle: string
  title: string
  brand: string
  imageUrl: string | null
  rating?: number
  reviewCount?: number
  categoryName?: string | null
  cheapestRetailerName?: string | null
  cheapestRetailerColor?: string | null
  bestDiscountPercent?: number
  listingCount?: number
  lowestPrice: number | null
  maximumSavings?: number | null
  isFavorite?: boolean
}

/** One product/variant in a grid — real prices, real savings, real retailer. */
export function ProductCard({ item }: { item: ProductCardData }) {
  const href = `/products/${item.variantSlug}`
  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="absolute right-2 top-2 z-10">
        <FavoriteButton variantId={item.variantId} initialSaved={item.isFavorite ?? false} size="icon" label={false} />
      </div>

      <Link href={href} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <ProductImage
            src={item.imageUrl}
            alt={item.variantTitle || item.title}
            fallbackLabel={item.brand}
            className="size-full transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {item.bestDiscountPercent && item.bestDiscountPercent >= 15 ? (
            <div className="absolute left-2 top-2">
              <DiscountBadge percent={item.bestDiscountPercent} />
            </div>
          ) : null}
        </div>

        <CardContent className="flex flex-1 flex-col gap-2 p-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.brand}</p>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
              {item.variantTitle || item.title}
            </h3>
          </div>

          {typeof item.rating === 'number' && item.rating > 0 ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3.5 fill-current text-warning" aria-hidden />
              <span className="font-medium text-foreground">{item.rating.toFixed(1)}</span>
              {item.reviewCount ? <span>({item.reviewCount.toLocaleString('en-IN')})</span> : null}
            </p>
          ) : null}

          <div className="mt-auto space-y-1.5 pt-1">
            {item.lowestPrice != null ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold tabular-nums">{formatPrice(item.lowestPrice)}</span>
                  {item.maximumSavings && item.maximumSavings > 0 ? (
                    <SavingsBadge amount={item.maximumSavings} className="text-[11px]" />
                  ) : null}
                </div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Store className="size-3" aria-hidden />
                  {item.cheapestRetailerName ?? 'Cheapest retailer unknown'}
                  {item.listingCount ? <span>· compared across {item.listingCount}</span> : null}
                </p>
              </>
            ) : (
              <Badge variant="muted">Price temporarily unavailable</Badge>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}

export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <CardContent className="space-y-2 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-6 w-28" />
      </CardContent>
    </Card>
  )
}

export function ProductGrid({ items, emptyMessage }: { items: ProductCardData[]; emptyMessage?: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
        <p className="font-semibold">Nothing matched</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {emptyMessage ?? 'Try a different search term or clear some filters.'}
        </p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ProductCard key={item.variantSlug} item={item} />
      ))}
    </div>
  )
}
