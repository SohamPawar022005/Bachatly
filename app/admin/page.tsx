import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { AdminConsole } from '@/components/admin/admin-console'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin console',
  description: 'Bachatly administration: catalogue, listings, prices, retailers, users and identity resolution.',
  robots: { index: false },
}

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=/admin')
  if (session.user.role !== 'ADMIN') redirect('/account')

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Admin console</h1>
            <Badge variant="outline">Signed in as {session.user.email}</Badge>
          </div>
          <p className="text-muted-foreground">
            Catalogue, retailer listings, price records and identity resolution — all backed by the same database the
            storefront reads.
          </p>
        </div>
      </header>
      <AdminConsole />
    </div>
  )
}
