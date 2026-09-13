import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgeIndianRupee, BellRing, Boxes, Building2, Database, History, SearchCheck, ShieldCheck, Sparkles, TrendingDown } from 'lucide-react'

import { getHomePage } from '@/services/home-service'
import { ProductCard } from '@/components/products/product-card'
import { HeroSearch } from '@/components/search/hero-search'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProductImage } from '@/components/products/product-image'
import { RetailerLogo } from '@/components/retailers/retailer-logo'
import { dealItemToCard, searchItemToCard } from '@/lib/ui/mappers'
import { formatCompactPrice, formatPrice } from '@/lib/utils/money'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Compare prices across Indian retailers. Save on every buy.',
  description:
    'Bachatly matches the same product across 6 Indian retailers, shows the honest cheapest price, tracks 90 days of price history and alerts you when prices drop.',
}

export default async function HomePage() {
  const { stats, categories, retailers, bestDeals, biggestDrops, popular, popularSearches } = await getHomePage()

  return (
    <div className="flex flex-col">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/8 via-accent/40 to-background">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div className="space-y-6">
            <Badge variant="outline" className="gap-1.5 border-primary/30 bg-card/60 px-3 py-1">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              {stats.products} products tracked across {stats.retailers} retailers
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Compare. Save. <span className="text-primary">Buy Smart.</span>
            </h1>
            <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
              The same product is priced differently at Amazon, Flipkart, Croma, Reliance Digital, Myntra and Meesho.
              Bachatly matches listings to one canonical product, finds the real cheapest price and tells you when it
              drops.
            </p>
            <HeroSearch suggestions={popularSearches.map((item) => item.query)} />
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-success" aria-hidden />
                No payment, no dark patterns
              </li>
              <li className="flex items-center gap-1.5">
                <History className="size-3.5 text-primary" aria-hidden />
                {stats.priceRecords.toLocaleString('en-IN')} price records in history
              </li>
              <li className="flex items-center gap-1.5">
                <BellRing className="size-3.5 text-warning-foreground" aria-hidden />
                Free drop alerts
              </li>
            </ul>
          </div>

          <div className="relative">
            <Card className="overflow-hidden border-primary/20 bg-card/80 shadow-lg backdrop-blur">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Live example from the catalogue</p>
                  <Badge variant="muted">Demo feed</Badge>
                </div>
                {bestDeals[0] ? (
                  <>
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={bestDeals[0].imageUrl}
                        alt={bestDeals[0].variantTitle}
                        fallbackLabel={bestDeals[0].brand}
                        className="size-16 rounded-lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{bestDeals[0].variantTitle}</p>
                        <p className="text-xs text-muted-foreground">{bestDeals[0].brand}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted p-2">
                        <p className="text-[11px] text-muted-foreground">Cheapest</p>
                        <p className="text-sm font-bold text-success">{formatPrice(bestDeals[0].lowestPrice)}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-2">
                        <p className="text-[11px] text-muted-foreground">Dearest</p>
                        <p className="text-sm font-bold">{formatPrice(bestDeals[0].highestPrice)}</p>
                      </div>
                      <div className="rounded-lg bg-success/12 p-2">
                        <p className="text-[11px] text-muted-foreground">You save</p>
                        <p className="text-sm font-bold text-success">{formatPrice(bestDeals[0].savings)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cheapest at <strong className="text-foreground">{bestDeals[0].cheapestRetailerName}</strong> ·
                      compared across {bestDeals[0].listingCount} retailers
                    </p>
                    <Button asChild className="w-full">
                      <Link href={`/products/${bestDeals[0].variantSlug}`}>
                        See full comparison
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No deals available yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ---------------- Stats ---------------- */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:px-6 lg:grid-cols-4">
          <StatTile icon={Boxes} label="Products tracked" value={stats.products.toLocaleString('en-IN')} hint={`${stats.variants} variants`} />
          <StatTile icon={Building2} label="Retailers compared" value={String(stats.retailers)} hint="mock feeds, labelled" />
          <StatTile icon={Database} label="Price records" value={stats.priceRecords.toLocaleString('en-IN')} hint="append-only history" />
          <StatTile
            icon={BadgeIndianRupee}
            label="Savings on the table"
            value={formatCompactPrice(stats.totalSavingsPotential)}
            hint={`across ${stats.variantsWithSavings} variants`}
          />
        </div>
      </section>

      {/* ---------------- Categories ---------------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <SectionHeading
          title="Browse by category"
          description="Nine shopping categories, each with its own comparison and price history."
          href="/categories"
          linkLabel="All categories"
        />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.slice(0, 10).map((category) => (
            <Link key={category.id} href={`/categories/${category.slug}`} className="group">
              <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
                <div className="aspect-[5/3] w-full overflow-hidden bg-muted">
                  <ProductImage
                    src={category.imageUrl}
                    alt={category.name}
                    fallbackLabel={category.name}
                    className="size-full transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <CardContent className="space-y-1 p-3">
                  <p className="truncate text-sm font-semibold">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.productCount} products
                    {category.cheapestPrice != null ? ` · from ${formatCompactPrice(category.cheapestPrice)}` : ''}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- Best deals ---------------- */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">
        <SectionHeading
          title="Best deals right now"
          description="Ranked by discount against the published MRP, computed from stored prices."
          href="/deals"
          linkLabel="See all deals"
        />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {bestDeals.slice(0, 8).map((deal) => (
            <ProductCard key={deal.variantSlug} item={dealItemToCard(deal)} />
          ))}
        </div>
      </section>

      {/* ---------------- Biggest drops ---------------- */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
          <SectionHeading
            title="Biggest price drops"
            description="Products whose cheapest price fell the furthest from their recorded high."
            href="/search?sort=discount"
            linkLabel="More discounts"
          />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {biggestDrops.slice(0, 8).map((deal) => (
              <ProductCard key={deal.variantSlug} item={dealItemToCard(deal)} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Popular ---------------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <SectionHeading
          title="Popular this week"
          description="The highest-rated products people compare on Bachatly."
          href="/search"
          linkLabel="Browse everything"
        />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {popular.slice(0, 8).map((item) => (
            <ProductCard key={item.variantSlug} item={searchItemToCard(item)} />
          ))}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: SearchCheck,
              title: '1. Listings become one product',
              body: 'Retailer listings are matched to a canonical Bachatly product and variant using GTIN, model number, brand, storage, colour and title similarity. Prices are only ever compared inside one resolved variant.',
            },
            {
              icon: TrendingDown,
              title: '2. The cheapest is derived, never claimed',
              body: 'Effective price = price + delivery fee − discount − coupon, and only where the retailer publishes reliable data. The cheapest offer is recomputed from stored prices on every request.',
            },
            {
              icon: BellRing,
              title: '3. We watch it for you',
              body: 'Save a favourite or set a target price. Background jobs re-check retailer feeds, append to an immutable history and notify you the moment your target is hit.',
            },
          ].map((step) => (
            <Card key={step.title}>
              <CardContent className="space-y-2 p-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="muted">Transparency</Badge>
            Retailer feeds in this build are clearly-labelled demonstration adapters — no live retailer data is
            scraped or misrepresented. Every price carries the timestamp it was checked, and Buy Now links out to the
            retailer with no payment handling on Bachatly.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {retailers.map((retailer) => (
              <span key={retailer.id} className="flex items-center gap-2 rounded-full border border-border bg-muted/50 py-1 pl-1 pr-3">
                <RetailerLogo name={retailer.name} brandColor={retailer.brandColor} className="size-6 text-[10px]" />
                <span className="text-xs font-medium">{retailer.name}</span>
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Boxes
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {hint ? <p className="text-[11px] text-muted-foreground/80">{hint}</p> : null}
      </div>
    </div>
  )
}

function SectionHeading({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string
  description?: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {href && linkLabel ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={href}>
            {linkLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
