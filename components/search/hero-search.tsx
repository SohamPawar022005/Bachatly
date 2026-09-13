'use client'

import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Big search field for the homepage — submits to /search. */
export function HeroSearch({ suggestions }: { suggestions: string[] }) {
  const [term, setTerm] = React.useState('')
  const router = useRouter()

  const go = (value: string) => {
    const query = value.trim()
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  return (
    <div className="w-full space-y-3">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          go(term)
        }}
        className="flex w-full flex-col gap-2 sm:flex-row"
        role="search"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search a product, brand or model number…"
            aria-label="Search products"
            className="h-13 rounded-xl bg-card pl-12 text-base shadow-sm sm:h-14"
          />
        </div>
        <Button type="submit" size="lg" className="h-13 rounded-xl px-8 sm:h-14">
          Compare prices
        </Button>
      </form>

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Popular:</span>
          {suggestions.slice(0, 6).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => go(suggestion)}
              className="rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium transition-colors hover:bg-card hover:text-primary"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
