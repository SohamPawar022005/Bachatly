import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Flame, Info, PiggyBank, TrendingDown } from 'lucide-react'

import { getDeals } from '@/services/deal-service'
import { ProductCard } from '@/components/products/product-card'
import { Badge } from '@/components/ui/badge'
import { dealItemToCard } from '@/lib/ui/mappers'
import { formatPrice } from '@/lib/utils/money'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Today's deals — biggest discounts and price drops",
  description:
    'Live deal ranking across Indian retailers: biggest discounts against MRP, the largest price drops from recorded highs, and products under ₹1,000, ₹5,000 and ₹10,000.',
  alternates: { canonical: '/deals' },
}

export default async function DealsPage() {
  const deals = await getDeals()

  const totalSavings = [...deals.bestDeals, ...deals.biggestDrops].reduce(
    (sum, deal) => sum + (deal.savings ?? 0),
    0,
  )

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-destructive/30 text-destructive">
            <Flame className="size-3.5" aria-hidden />
            Ranked from stored prices
          </Badge>
          <Badge variant="muted">Demo retailer feeds</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Today&rsquo;s deals</h1>
        <p className="max-w-2xl text-muted-foreground">
          Deals are ranked by the discount a retailer is currently publishing against the product&rsquo;s MRP, and by how
          far the cheapest price has fallen from its recorded high. Across these deals you could save up to{' '}
          <strong className="font-semibold text-success">{formatPrice(totalSavings)}</strong> by choosing the cheapest
          retailer.
        </p>
      </header>

      <Section
        id="best-deals"
        icon={Flame}
        title="Best deals right now"
        description="Largest published discounts against MRP."
        items={deals.bestDeals}
      />

      <Section
        id="biggest-drops"
        icon={TrendingDown}
        title="Biggest price drops"
        description="Cheapest price versus the highest price we have on record."
        items={deals.biggestDrops}
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <BudgetColumn title="Under ₹1,000" items={deals.under1000} />
        <BudgetColumn title="Under ₹5,000" items={deals.under5000} />
        <BudgetColumn title="Under ₹10,000" items={deals.under10000} />
      </div>

      <div className="mt-12 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <PiggyBank className="size-4" aria-hidden />
            How we rank deals
          </p>
          <p>
            A &ldquo;deal&rdquo; is not a sponsored slot. It is the gap between the published MRP and the current
            effective price (price + delivery − discount − qualifying coupon), computed per retailer from stored price
            records. The cheapest retailer shown is whichever offer has the lowest effective price at request time.
          </p>
          <p>
            Retailer data in this build comes from clearly-labelled demonstration adapters, each with its own feed
            quirks. Every price carries the timestamp it was checked.
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({
  id,
  icon: Icon,
  title,
  description,
  items,
}: {
  id: string
  icon: typeof Flame
  title: string
  description: string
  items: Awaited<ReturnType<typeof getDeals>>['bestDeals']
}) {
  return (
    <section id={id} className="mt-10 first:mt-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Icon className="size-5 text-destructive" aria-hidden />
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <PiggyBank className="size-3.5" aria-hidden />
          up to {formatPrice(Math.max(0, ...items.map((item) => item.savings ?? 0)))} saved
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No deals in this list yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.slice(0, 8).map((deal) => (
            <ProductCard key={deal.variantSlug} item={dealItemToCard(deal)} />
          ))}
        </div>
      )}
    </section>
  )
}

function BudgetColumn({
  title,
  items,
}: {
  title: string
  items: Awaited<ReturnType<typeof getDeals>>['under1000']
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{items.length} tracked</span>
      </div>
      <ul className="space-y-3">
        {items.slice(0, 6).map((item) => (
          <li key={item.variantSlug}>
            <Link href={`/products/${item.variantSlug}`} className="group flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium group-hover:text-primary">{item.variantTitle}</span>
                <span className="block text-xs text-muted-foreground">
                  {item.brand} · {item.cheapestRetailerName ?? '—'}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold tabular-nums">{formatPrice(item.lowestPrice)}</span>
                {item.discountPercent > 0 ? (
                  <span className="block text-xs font-medium text-destructive">{item.discountPercent}% off</span>
                ) : null}
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
            </Link>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nothing tracked in this band.</li>
        ) : null}
      </ul>
    </div>
  )
}
