import type { Metadata } from 'next'
import { Suspense } from 'react'

import { SearchResults } from '@/components/search/search-results'
import { ProductCardSkeleton } from '@/components/products/product-card'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search products',
  description: 'Search the Bachatly catalogue and compare prices for every variant across Indian retailers.',
  robots: { index: false },
}

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </div>
  )
}
