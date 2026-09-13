'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { Filter, ListFilter, SlidersHorizontal, X } from 'lucide-react'

import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ProductCard, ProductCardSkeleton } from '@/components/products/product-card'
import { searchItemToCard } from '@/lib/ui/mappers'
import type { UiSearchResult } from '@/lib/ui/types'
import { cn } from '@/lib/utils/cn'

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'cheapest', label: 'Cheapest first' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'discount', label: 'Biggest discount' },
  { value: 'rating', label: 'Top rated' },
  { value: 'delivery', label: 'Fastest delivery' },
  { value: 'newest', label: 'Newest' },
] as const

/** Multi-value filters are comma separated in the URL so results are shareable. */
function csv(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

export function SearchResults() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mobileFilters, setMobileFilters] = React.useState(false)

  const query = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? 1)
  const sort = searchParams.get('sort') ?? 'relevance'

  const setParams = React.useCallback(
    (updates: Record<string, string | null>, options: { resetPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      if (options.resetPage !== false) next.delete('page')
      router.replace(`/search?${next.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const toggleIn = (key: string, value: string) => {
    const current = csv(searchParams.get(key))
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    setParams({ [key]: next.length ? next.join(',') : null })
  }

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['search', searchParams.toString()],
    queryFn: () => api.get<UiSearchResult>(`/api/search?${searchParams.toString()}`),
    placeholderData: (previous) => previous,
  })

  const activeFilterCount =
    csv(searchParams.get('brand')).length +
    csv(searchParams.get('retailer')).length +
    (searchParams.get('category') ? 1 : 0) +
    (searchParams.get('maxPrice') || searchParams.get('minPrice') ? 1 : 0) +
    (searchParams.get('minRating') ? 1 : 0) +
    (searchParams.get('freeDelivery') ? 1 : 0) +
    (searchParams.get('inStockOnly') ? 1 : 0)

  const clearAll = () => {
    const next = new URLSearchParams()
    if (query) next.set('q', query)
    router.replace(`/search?${next.toString()}`)
  }

  const filters = data ? (
    <div className="space-y-6">
      <FilterGroup title="Category">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!searchParams.get('category')}
              onCheckedChange={() => setParams({ category: null })}
              aria-label="All categories"
            />
            <span className={cn(!searchParams.get('category') && 'font-medium')}>All categories</span>
          </label>
          {data.facets.categories.map((category) => (
            <label key={category.slug} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={searchParams.get('category') === category.slug}
                onCheckedChange={() =>
                  setParams({ category: searchParams.get('category') === category.slug ? null : category.slug })
                }
                aria-label={category.name}
              />
              <span className={cn(searchParams.get('category') === category.slug && 'font-medium')}>{category.name}</span>
            </label>
          ))}
        </div>
      </FilterGroup>

      {data.facets.brands.length > 0 ? (
        <FilterGroup title="Brand">
          <div className="space-y-2">
            {data.facets.brands.map((brand) => (
              <label key={brand} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={csv(searchParams.get('brand')).includes(brand)}
                  onCheckedChange={() => toggleIn('brand', brand)}
                  aria-label={brand}
                />
                <span>{brand}</span>
              </label>
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {data.facets.retailers.length > 0 ? (
        <FilterGroup title="Available at">
          <div className="space-y-2">
            {data.facets.retailers.map((retailer) => (
              <label key={retailer.slug} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={csv(searchParams.get('retailer')).includes(retailer.slug)}
                  onCheckedChange={() => toggleIn('retailer', retailer.slug)}
                  aria-label={retailer.name}
                />
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: retailer.brandColor }} aria-hidden />
                  {retailer.name}
                </span>
              </label>
            ))}
          </div>
        </FilterGroup>
      ) : null}

      <FilterGroup title="Price">
        <div className="space-y-2">
          {data.facets.priceBuckets.map((bucket) => {
            const active =
              (bucket.min ? searchParams.get('minPrice') === String(bucket.min) : !searchParams.get('minPrice')) &&
              (bucket.max ? searchParams.get('maxPrice') === String(bucket.max) : !searchParams.get('maxPrice'))
            return (
              <label key={bucket.label} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={active}
                  onCheckedChange={() =>
                    setParams({
                      minPrice: active ? null : bucket.min ? String(bucket.min) : null,
                      maxPrice: active ? null : bucket.max ? String(bucket.max) : null,
                    })
                  }
                  aria-label={bucket.label}
                />
                <span className={cn(active && 'font-medium')}>{bucket.label}</span>
              </label>
            )
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Rating">
        <div className="space-y-2">
          {[4.5, 4, 3.5].map((rating) => (
            <label key={rating} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={searchParams.get('minRating') === String(rating)}
                onCheckedChange={() =>
                  setParams({ minRating: searchParams.get('minRating') === String(rating) ? null : String(rating) })
                }
                aria-label={`${rating} stars and up`}
              />
              <span>{rating}★ &amp; up</span>
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Delivery & stock">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(searchParams.get('freeDelivery'))}
              onCheckedChange={() => setParams({ freeDelivery: searchParams.get('freeDelivery') ? null : 'true' })}
              aria-label="Free delivery only"
            />
            <span>Free delivery only</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(searchParams.get('inStockOnly'))}
              onCheckedChange={() => setParams({ inStockOnly: searchParams.get('inStockOnly') ? null : 'true' })}
              aria-label="In stock only"
            />
            <span>In stock only</span>
          </label>
        </div>
      </FilterGroup>
    </div>
  ) : (
    <div className="space-y-4">
      {[0, 1, 2].map((index) => (
        <div key={index} className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className={cn('lg:sticky lg:top-20 lg:self-start', mobileFilters ? 'block' : 'hidden lg:block')}>
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="size-4" aria-hidden />
                Filters
                {activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount}</Badge> : null}
              </h2>
              {activeFilterCount > 0 ? (
                <button type="button" onClick={clearAll} className="text-xs text-primary hover:underline">
                  Clear all
                </button>
              ) : null}
            </div>
            {filters}
          </CardContent>
        </Card>
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">
              {query ? (
                <>
                  Results for <span className="text-primary">&ldquo;{query}&rdquo;</span>
                </>
              ) : (
                'All products'
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isPending
                ? 'Searching…'
                : data
                  ? `${data.total.toLocaleString('en-IN')} variant${data.total === 1 ? '' : 's'} · matched by ${data.strategy} in ${data.tookMs}ms`
                  : ''}
              {isFetching && !isPending ? ' · updating…' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileFilters((open) => !open)}>
              <ListFilter className="size-4" aria-hidden />
              Filters
            </Button>
            <Select value={sort} onValueChange={(value) => setParams({ sort: value === 'relevance' ? null : value })}>
              <SelectTrigger size="sm" className="w-44" aria-label="Sort results">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isError ? (
          <ErrorState title="Search failed" message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={Filter}
            title={query ? `No products matched “${query}”` : 'No products matched these filters'}
            description="Try a shorter query, check the spelling, or clear some filters. Search covers product titles, brands, model numbers and SKUs."
            action={
              activeFilterCount > 0 ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  <X className="size-4" aria-hidden />
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {data.items.map((item) => (
                <ProductCard key={item.variantSlug} item={searchItemToCard(item)} />
              ))}
            </div>

            {data.totalPages > 1 ? (
              <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setParams({ page: String(page - 1) }, { resetPage: false })}
                >
                  Previous
                </Button>
                <span className="px-2 text-sm text-muted-foreground">
                  Page {data.page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setParams({ page: String(page + 1) }, { resetPage: false })}
                >
                  Next
                </Button>
              </nav>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
      <Separator className="mt-4" />
    </div>
  )
}
