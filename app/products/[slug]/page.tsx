import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, ChevronRight, Info, PackageX, Star, Store } from 'lucide-react'

import { auth } from '@/lib/auth'
import { getProductDetail } from '@/services/product-service'
import { ERROR_CODES } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ProductImage } from '@/components/products/product-image'
import { ProductCard } from '@/components/products/product-card'
import { FavoriteButton } from '@/components/favorite/favorite-button'
import { PriceComparison } from '@/components/comparison/price-comparison'
import { PriceHistoryChart } from '@/components/comparison/price-history-chart'
import { AlertForm } from '@/components/alerts/alert-form'
import { DemoDataBadge, DiscountBadge } from '@/components/badges'
import { relatedItemToCard } from '@/lib/ui/mappers'
import { formatPrice } from '@/lib/utils/money'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function load(slug: string) {
  const session = await auth()
  try {
    return await getProductDetail(slug, { userId: session?.user?.id })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === ERROR_CODES.PRODUCT_NOT_FOUND) {
      notFound()
    }
    throw error
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await load(slug)
  const comparison = product.pricing.comparison
  const lowest = comparison.lowestPrice

  const description = [
    `${product.variantTitle || product.fullTitle} price comparison across Indian retailers.`,
    lowest !== null ? `Cheapest today: ${formatPrice(lowest)} at ${comparison.cheapestRetailer ?? 'a tracked retailer'}.` : null,
    comparison.maximumSavings && comparison.maximumSavings > 0
      ? `Save up to ${formatPrice(comparison.maximumSavings)} by picking the right retailer.`
      : null,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    title: `${product.variantTitle || product.fullTitle} — price comparison`,
    description,
    alternates: { canonical: `/products/${product.variantSlug}` },
    openGraph: {
      title: `${product.variantTitle || product.fullTitle} · Bachatly`,
      description,
      url: `/products/${product.variantSlug}`,
      type: 'website',
      ...(product.imageUrl ? { images: [{ url: product.imageUrl }] } : {}),
    },
    twitter: { card: 'summary_large_image', title: product.variantTitle, description },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = await load(slug)
  const comparison = product.pricing.comparison
  const classification = product.pricing.history.classification
  const cheapest = comparison.comparableOffers[0]
  const savings = comparison.maximumSavings ?? 0

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.variantTitle || product.fullTitle,
    brand: { '@type': 'Brand', name: product.brand },
    description: product.description ?? undefined,
    sku: product.sku ?? undefined,
    gtin: product.gtin ?? undefined,
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    ...(product.rating > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
            bestRating: 5,
          },
        }
      : {}),
    offers:
      comparison.lowestPrice !== null
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: 'INR',
            lowPrice: comparison.lowestPrice / 100,
            highPrice: (comparison.highestPrice ?? comparison.lowestPrice) / 100,
            offerCount: comparison.comparableOffers.length,
            availability: 'https://schema.org/InStock',
            url: `/products/${product.variantSlug}`,
          }
        : undefined,
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <script
        type="application/ld+json"
        // Structured data is generated from our own database rows, never user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        {product.categorySlug ? (
          <>
            <Link href={`/categories/${product.categorySlug}`} className="hover:text-foreground">
              {product.categoryName}
            </Link>
            <ChevronRight className="size-3" aria-hidden />
          </>
        ) : null}
        <span className="truncate text-foreground">{product.brand}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* Left column */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ProductImage
              src={product.imageUrl}
              alt={product.variantTitle || product.title}
              fallbackLabel={product.brand}
              className="aspect-square w-full"
              priority
            />
          </div>

          <Card>
            <CardContent className="space-y-3 p-4">
              {cheapest ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Lowest price right now</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold tabular-nums text-success">{formatPrice(comparison.lowestPrice)}</span>
                      {cheapest.discount >= 10 ? <DiscountBadge percent={cheapest.discount} /> : null}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                      <Store className="size-3.5" aria-hidden />
                      at {comparison.cheapestRetailer}
                    </p>
                  </div>

                  {savings > 0 ? (
                    <p className="rounded-lg bg-success/10 px-3 py-2 text-sm">
                      <strong className="font-semibold text-success">Save {formatPrice(savings)}</strong> versus the most
                      expensive retailer tracked for this product.
                    </p>
                  ) : null}

                  {classification ? (
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        <strong className="font-medium text-foreground">{classification.label}</strong> —{' '}
                        {classification.reason}
                      </span>
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <FavoriteButton variantId={product.variantId} initialSaved={product.isFavorite} />
                    {product.pricing.isDemoData ? <DemoDataBadge /> : null}
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="size-3.5" aria-hidden />
                    Prices are refreshed by background jobs; each offer shows when it was last checked.
                  </p>
                </>
              ) : (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <PackageX className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    No comparable offer is available for this variant right now. We keep checking the retailer feeds.
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Set a price alert</CardTitle>
              <CardDescription>
                We check the feeds on a schedule and notify you the moment the price hits your target.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertForm
                variantId={product.variantId}
                variantTitle={product.variantTitle || product.title}
                currentPrice={comparison.lowestPrice}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="min-w-0 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{product.brand}</Badge>
              {product.modelNumber ? <Badge variant="outline">Model {product.modelNumber}</Badge> : null}
              {product.sku ? <Badge variant="outline">SKU {product.sku}</Badge> : null}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.variantTitle || product.fullTitle}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {product.rating > 0 ? (
                <span className="flex items-center gap-1">
                  <Star className="size-4 fill-current text-warning" aria-hidden />
                  <strong className="text-foreground">{product.rating.toFixed(1)}</strong>
                  <span>({product.reviewCount.toLocaleString('en-IN')} reviews)</span>
                </span>
              ) : null}
              {product.categorySlug ? (
                <Link href={`/categories/${product.categorySlug}`} className="hover:text-foreground">
                  {product.categoryName}
                </Link>
              ) : null}
              <span>{comparison.offerCount} retailer listings tracked</span>
            </div>
            {product.description ? <p className="max-w-3xl text-sm text-muted-foreground">{product.description}</p> : null}
          </div>

          {product.variants.length > 1 ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold">Choose a variant</h2>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const active = variant.id === product.variantId
                  return (
                    <Button
                      key={variant.id}
                      asChild
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      aria-current={active ? 'true' : undefined}
                    >
                      <Link href={`/products/${variant.slug}`}>
                        <span>{variant.title}</span>
                        {variant.lowestPrice !== null ? (
                          <span className="text-xs opacity-80">{formatPrice(variant.lowestPrice)}</span>
                        ) : null}
                      </Link>
                    </Button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <PriceComparison variantSlug={product.variantSlug} />
          <PriceHistoryChart variantSlug={product.variantSlug} />

          {product.specifications && Object.keys(product.specifications).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
                      <dt className="text-sm text-muted-foreground">{key}</dt>
                      <dd className="text-right text-sm font-medium">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">How this comparison is built</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Every retailer listing for this variant was matched to one canonical Bachatly variant through identity
                resolution (GTIN, model number, brand, storage, colour and title similarity). Only resolved, in-stock,
                priced listings are compared.
              </p>
              <p>
                The effective price adds published delivery fees and subtracts published discounts and qualifying
                coupons — retailer discounts are never double-counted. Listings whose price or availability is unknown
                are listed separately as unavailable rather than guessed.
              </p>
              <Separator />
              <p className="text-xs">
                Bachatly never processes payments. &ldquo;Buy now&rdquo; opens the retailer&rsquo;s own site in a new tab
                with <code>rel=&quot;nofollow noopener noreferrer&quot;</code>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {product.related.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold tracking-tight">Related products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {product.related.slice(0, 4).map((item) => (
              <ProductCard key={item.variantSlug} item={relatedItemToCard(item)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
