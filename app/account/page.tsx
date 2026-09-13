import type { Metadata } from 'next'

import { AccountDashboard } from '@/components/account/account-dashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My dashboard',
  description: 'Your Bachatly dashboard: saved products, price alerts, notifications and recent searches.',
  robots: { index: false },
}

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Your dashboard</h1>
        <p className="text-muted-foreground">
          Saved products, price alerts and notifications — all driven by the same data the public site shows.
        </p>
      </header>
      <AccountDashboard />
    </div>
  )
}
