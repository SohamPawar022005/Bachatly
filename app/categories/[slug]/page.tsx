import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

import { getCategoryPage } from '@/services/category-service'
import { ERROR_CODES } from '@/lib/api/errors'
import { ProductCard } from '@/components/products/product-card'
import { Badge } from '@/components/ui/badge'
import { ProductImage } from '@/components/products/product-image'
import { searchItemToCard } from '@/lib/ui/mappers'
import { formatCompactPrice } from '@/lib/utils/money'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function toQuery(searchParams: Record<string, string | string[] | undefined>) {
  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') query[key] = value
    else if (Array.isArray(value) && value.length > 0) query[key] = value[0]
  }
  return query
}

async function load(slug: string, searchParams: Awaited<PageProps['searchParams']>) {
  try {
    return await getCategoryPage(slug, toQuery(searchParams))
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === ERROR_CODES.CATEGORY_NOT_FOUND) {
      notFound()
    }
    throw error
  }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = await load(slug, await searchParams)
  return {
    title: `${page.name} — compare prices`,
    description:
      page.description ??
      `Compare ${page.name.toLowerCase()} prices across Indian retailers on Bachatly. ${page.products.total} variants tracked.`,
    alternates: { canonical: `/categories/${page.slug}` },
    openGraph: {
      title: `${page.name} price comparison · Bachatly`,
      description: `${page.products.total} ${page.name} variants compared across retailers.`,
    },
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const resolvedParams = await searchParams
  const page = await load(slug, resolvedParams)
  const query = toQuery(resolvedParams)
  const currentPage = Number(query.page ?? 1)

  const cheapest = page.products.items
    .map((item) => item.comparison.lowestPrice)
    .filter((price): price is number => price !== null)
    .sort((a, b) => a - b)[0]

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        <Link href="/categories" className="hover:text-foreground">
          Categories
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        <span className="text-foreground">{page.name}</span>
      </nav>

      <header className="mb-8 flex flex-wrap items-start gap-6">
        <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-32">
          <ProductImage
            src={page.imageUrl}
            alt={page.name}
            fallbackLabel={page.name}
            className="size-full"
            priority
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{page.name}</h1>
          {page.description ? <p className="max-w-2xl text-muted-foreground">{page.description}</p> : null}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{page.products.total} variants</Badge>
            {cheapest !== undefined ? <Badge variant="outline">from {formatCompactPrice(cheapest)}</Badge> : null}
            {page.subcategories.length > 0 ? (
              <span className="text-xs">
                includes {page.subcategories.map((sub) => sub.name).join(', ')}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {page.subcategories.length > 0 ? (
        <div className="mb-8 flex flex-wrap gap-2">
          {page.subcategories.map((sub) => (
            <Link key={sub.slug} href={`/categories/${sub.slug}`}>
              <Badge variant="outline" className="px-3 py-1.5 transition-colors hover:bg-accent">
                {sub.name}
              </Badge>
            </Link>
          ))}
        </div>
      ) : null}

      {page.bestDeals.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold tracking-tight">Top deals in {page.name}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {page.bestDeals.slice(0, 6).map((item) => (
              <ProductCard key={item.variantSlug} item={searchItemToCard(item)} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight">All {page.name.toLowerCase()}</h2>
          <p className="text-sm text-muted-foreground">
            Page {page.products.page} of {page.products.totalPages} · sorted by{' '}
            {page.products.sort.replace('_', ' ')}
          </p>
        </div>

        {page.products.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No products in this category yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {page.products.items.map((item) => (
              <ProductCard key={item.variantSlug} item={searchItemToCard(item)} />
            ))}
          </div>
        )}

        {page.products.totalPages > 1 ? (
          <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
            {currentPage > 1 ? (
              <Link href={`/categories/${page.slug}?page=${currentPage - 1}`}>
                <Badge variant="outline" className="px-4 py-2">
                  Previous
                </Badge>
              </Link>
            ) : null}
            <span className="px-2 text-sm text-muted-foreground">
              {page.products.page} / {page.products.totalPages}
            </span>
            {currentPage < page.products.totalPages ? (
              <Link href={`/categories/${page.slug}?page=${currentPage + 1}`}>
                <Badge variant="outline" className="px-4 py-2">
                  Next
                </Badge>
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </div>
  )
}
