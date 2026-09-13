import type { Metadata } from 'next'

import { AlertsList } from '@/components/alerts/alerts-list'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Price alerts',
  description: 'Your Bachatly price alerts: target prices, current prices and how far each one is from triggering.',
  robots: { index: false },
}

export default function AlertsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Price alerts</h1>
        <p className="text-muted-foreground">
          Set a target price on any product. When a retailer feed drops to or below it, you get a notification.
        </p>
      </header>
      <AlertsList />
    </div>
  )
}
