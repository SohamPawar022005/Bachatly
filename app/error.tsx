'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, ServerCrash } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Errors are already reported server-side; log a breadcrumb here too.
    console.error('[page-error]', error.digest ?? error.message)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ServerCrash className="size-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground">
        We hit an unexpected error while loading this page. Your data is safe — try again, and if it keeps happening the
        details have been logged.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
