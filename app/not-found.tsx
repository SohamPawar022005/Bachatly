import Link from 'next/link'
import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="text-2xl font-bold tracking-tight">We could not find that page</h1>
      <p className="text-muted-foreground">
        The product, category or account page you were looking for does not exist — or the retailer listing it came from
        was never resolved to a product we track.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">
            <Search className="size-4" aria-hidden />
            Search products
          </Link>
        </Button>
      </div>
    </div>
  )
}
