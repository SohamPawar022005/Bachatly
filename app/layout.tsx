import type { Metadata, Viewport } from 'next'

import { Providers } from '@/app/providers'
import { ToastProvider } from '@/components/ui/toast'
import { Header } from '@/components/navigation/header'
import { Footer } from '@/components/navigation/footer'

import '@/app/globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bachatly.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Bachatly — Compare prices across Indian retailers. Save on every buy.',
    template: '%s · Bachatly',
  },
  description:
    'Bachatly compares the same product across Amazon, Flipkart, Croma, Reliance Digital, Myntra and Meesho so you can find the cheapest retailer, track price history and get alerted on drops.',
  keywords: ['price comparison', 'cheapest price India', 'price history', 'price drop alert', 'deals'],
  openGraph: {
    title: 'Bachatly — Compare. Save. Buy Smart.',
    description: 'Real price comparison across Indian retailers, with price history and drop alerts.',
    url: siteUrl,
    siteName: 'Bachatly',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image', title: 'Bachatly', description: 'Compare prices. Save money. Buy smart.' },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-svh flex-col">
        <Providers>
          <ToastProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
            >
              Skip to content
            </a>
            <Header />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
          </ToastProvider>
        </Providers>
      </body>
    </html>
  )
}
