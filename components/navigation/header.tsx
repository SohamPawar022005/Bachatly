'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Bell,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Shield,
  TrendingDown,
  User,
} from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils/cn'

const NAV = [
  { href: '/deals', label: 'Deals' },
  { href: '/categories', label: 'Categories' },
  { href: '/favorites', label: 'Favourites' },
  { href: '/alerts', label: 'Alerts' },
]

export function Header() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [term, setTerm] = React.useState('')
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => setMobileOpen(false), [pathname])

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const query = term.trim()
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Bachatly home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <TrendingDown className="size-5" aria-hidden />
          </span>
          <span className="hidden text-lg font-bold tracking-tight sm:block">
            Bachatly
          </span>
        </Link>

        <form onSubmit={submitSearch} className="relative hidden flex-1 md:block" role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search 400+ products: iPhone 16, air fryer, running shoes…"
            className="pl-9"
            aria-label="Search products"
          />
        </form>

        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Button
              key={item.href}
              asChild
              variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
              size="sm"
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <Button asChild variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open search">
            <Link href="/search">
              <Search className="size-5" />
            </Link>
          </Button>

          {status === 'authenticated' && session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                    {(session.user.name ?? session.user.email ?? 'U').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[8rem] truncate sm:block">{session.user.name ?? 'Account'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal">
                  <span className="block text-sm font-medium">{session.user.name}</span>
                  <span className="block text-xs text-muted-foreground">{session.user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <LayoutDashboard />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/favorites">
                    <Heart />
                    Favourites
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/alerts">
                    <Bell />
                    Price alerts
                  </Link>
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield />
                      Admin console
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    void signOut({ callbackUrl: '/' })
                  }}
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <User className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-card px-4 py-3 lg:hidden">
          <form onSubmit={submitSearch} className="relative mb-3" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search products"
              className="pl-9"
              aria-label="Search products"
            />
          </form>
          <nav className="grid gap-1" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                  pathname.startsWith(item.href) && 'bg-accent text-accent-foreground',
                )}
              >
                {item.label}
              </Link>
            ))}
            {status === 'authenticated' ? (
              <Link href="/account" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent">
                My dashboard
              </Link>
            ) : (
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
