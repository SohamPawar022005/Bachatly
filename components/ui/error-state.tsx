'use client'

import { RefreshCw, ServerCrash } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/**
 * Shown when an API call fails — the spec requires an explicit failure state
 * rather than a silently empty list.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <Alert variant="destructive" className={className}>
      <div className="flex items-start gap-3">
        <ServerCrash className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <AlertTitle className="text-destructive">{title}</AlertTitle>
          <AlertDescription>{message ?? 'The request could not be completed. Please try again.'}</AlertDescription>
        </div>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw />
            Retry
          </Button>
        ) : null}
      </div>
    </Alert>
  )
}
