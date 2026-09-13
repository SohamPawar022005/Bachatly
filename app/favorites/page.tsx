import type { Metadata } from 'next'

import { FavoritesList } from '@/components/favorites/favorites-list'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Favourites',
  description: 'Products you saved on Bachatly, with their current cheapest price.',
  robots: { index: false },
}

export default function FavoritesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Your favourites</h1>
        <p className="text-muted-foreground">
          Everything you saved, with the cheapest price available right now across tracked retailers.
        </p>
      </header>
      <FavoritesList />
    </div>
  )
}
