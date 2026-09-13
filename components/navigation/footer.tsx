import Link from 'next/link'
import { TrendingDown } from 'lucide-react'

const LINKS: { heading: string; items: { href: string; label: string }[] }[] = [
  {
    heading: 'Shop',
    items: [
      { href: '/deals', label: "Today's deals" },
      { href: '/categories', label: 'All categories' },
      { href: '/search?sort=price-drop', label: 'Biggest price drops' },
    ],
  },
  {
    heading: 'Account',
    items: [
      { href: '/favorites', label: 'Favourites' },
      { href: '/alerts', label: 'Price alerts' },
      { href: '/account', label: 'Dashboard' },
    ],
  },
  {
    heading: 'About',
    items: [
      { href: '/deals', label: 'How deals are ranked' },
      { href: '/categories/mobiles', label: 'Mobile price tracker' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrendingDown className="size-4" aria-hidden />
            </span>
            <span className="text-base font-bold">Bachatly</span>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Compare. Save. Buy Smart. We match the same product across Indian retailers, track its price history and
            tell you the honest cheapest price.
          </p>
          <p className="text-xs text-muted-foreground">
            Prices shown are demonstration data from mock retailer feeds — every price is timestamped and labelled.
            Bachatly does not sell anything and never processes payments.
          </p>
        </div>
        {LINKS.map((group) => (
          <div key={group.heading}>
            <h3 className="mb-3 text-sm font-semibold">{group.heading}</h3>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item.href + item.label}>
                  <Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-4 sm:px-6">
        <p className="mx-auto max-w-7xl text-xs text-muted-foreground">
          © {new Date().getFullYear()} Bachatly. Built as a full-stack price-comparison platform demo.
        </p>
      </div>
    </footer>
  )
}
