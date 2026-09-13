import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AuthForm } from '@/components/auth/auth-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Create a free Bachatly account to track prices, save favourites and get price drop alerts.',
  robots: { index: false },
}

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6 lg:py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Free forever. All we ask for is your name, email and a password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <AuthForm mode="register" />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
