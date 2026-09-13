import type { Metadata } from 'next'
import Link from 'next/link'

import { listCategoriesWithCounts } from '@/lib/db/repositories/category-repository'
import { ProductImage } from '@/components/products/product-image'
import { Card, CardContent } from '@/components/ui/card'
import { formatCompactPrice } from '@/lib/utils/money'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Browse categories',
  description: 'Browse every product category tracked on Bachatly, with the lowest price currently available in each.',
  alternates: { canonical: '/categories' },
}

export default async function CategoriesPage() {
  const categories = await listCategoriesWithCounts()

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Categories</h1>
        <p className="max-w-2xl text-muted-foreground">
          {categories.length} categories. Parent categories include everything filed under their subcategories, so you
          always see the full comparable range.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <Link key={category.id} href={`/categories/${category.slug}`} className="group">
            <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
              <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                <ProductImage
                  src={category.imageUrl}
                  alt={category.name}
                  fallbackLabel={category.name}
                  className="size-full transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <CardContent className="space-y-1 p-4">
                <p className="font-semibold">{category.name}</p>
                {category.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{category.description}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {category.productCount} products
                  {category.cheapestPrice != null ? ` · from ${formatCompactPrice(category.cheapestPrice)}` : ''}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
