import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { ShieldCheck, TrendingDown } from 'lucide-react'

import { AuthForm } from '@/components/auth/auth-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Bachatly to save favourites, set price alerts and get notified about drops.',
  robots: { index: false },
}

export default function LoginPage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
      <div className="order-2 space-y-4 lg:order-1">
        <h2 className="text-2xl font-bold tracking-tight">Why sign in?</h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          {[
            'Save products and watch their prices across every tracked retailer.',
            'Set a target price — we check the feeds on a schedule and notify you the moment it is met.',
            'See your search history, favourites and alert history in one dashboard.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              {item}
            </li>
          ))}
        </ul>

        <Separator />

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <TrendingDown className="size-4 text-primary" aria-hidden />
            Seeded demo accounts
          </p>
          <dl className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between gap-4">
              <dt>Shopper</dt>
              <dd className="font-mono">demo@bachatly.app / Demo@12345</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Admin</dt>
              <dd className="font-mono">admin@bachatly.app / Admin@12345</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Or <Link href="/register" className="text-primary hover:underline">create your own account</Link>.
          </p>
        </div>
      </div>

      <Card className="order-1 h-fit lg:order-2">
        <CardHeader>
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Bachatly account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <AuthForm mode="login" />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
