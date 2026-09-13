'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellRing, CheckCheck, Clock, Heart, Search, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { FavoritesList } from '@/components/favorites/favorites-list'
import { AlertsList } from '@/components/alerts/alerts-list'
import { relativeTime } from '@/lib/utils/time'
import type { UiAccountOverview, UiNotificationList, UiSearchHistoryItem } from '@/lib/ui/types'

/** The signed-in user's dashboard: activity, favourites, alerts, notifications. */
export function AccountDashboard() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const overview = useQuery({
    queryKey: ['account', 'overview'],
    queryFn: () => api.get<UiAccountOverview>('/api/account/overview'),
  })

  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<UiNotificationList>('/api/notifications?pageSize=25'),
  })

  const history = useQuery({
    queryKey: ['search-history'],
    queryFn: () => api.get<{ items: UiSearchHistoryItem[] }>('/api/user/search-history'),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch<{ read: boolean }>(`/api/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['account'] })
    },
    onError: (error: unknown) =>
      toast({ title: 'Could not update notification', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  const markAll = useMutation({
    mutationFn: () => api.patch<{ updated: number }>('/api/notifications'),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['account'] })
      toast({ title: `${result.updated} notification${result.updated === 1 ? '' : 's'} marked as read`, variant: 'success' })
    },
    onError: (error: unknown) =>
      toast({ title: 'Could not update notifications', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  const clearHistory = useMutation({
    mutationFn: () => api.delete<{ removed: number }>('/api/user/search-history'),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['search-history'] })
      toast({ title: `Cleared ${result.removed} search record${result.removed === 1 ? '' : 's'}`, variant: 'info' })
    },
    onError: (error: unknown) =>
      toast({ title: 'Could not clear history', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  const stats = overview.data

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Heart}
          label="Saved products"
          value={stats?.savedProducts}
          href="/favorites"
          pending={overview.isPending}
        />
        <StatCard icon={BellRing} label="Price alerts" value={stats?.activeAlerts} href="/alerts" pending={overview.isPending} />
        <StatCard
          icon={Bell}
          label="Unread notifications"
          value={stats?.unreadNotifications ?? notifications.data?.unreadCount}
          pending={overview.isPending}
        />
      </section>

      {overview.isError ? (
        <ErrorState
          title="Could not load your dashboard"
          message={overview.error instanceof Error ? overview.error.message : undefined}
          onRetry={() => void overview.refetch()}
        />
      ) : null}

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="favourites">Favourites</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {notifications.data && notifications.data.unreadCount > 0 ? (
              <Badge variant="secondary" className="ml-1">
                {notifications.data.unreadCount}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Recent searches</CardTitle>
                <CardDescription>What you have looked up recently.</CardDescription>
              </div>
              {history.data && history.data.items.length > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearHistory.mutate()}
                  disabled={clearHistory.isPending}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Clear
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {history.isPending ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-6 w-full" />
                  ))}
                </div>
              ) : history.isError ? (
                <ErrorState title="Could not load search history" onRetry={() => void history.refetch()} />
              ) : !history.data || history.data.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No searches recorded yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {history.data.items.map((item) => (
                    <li key={`${item.query}-${item.createdAt}`}>
                      <Link href={`/search?q=${encodeURIComponent(item.query)}`}>
                        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 transition-colors hover:bg-accent">
                          <Search className="size-3" aria-hidden />
                          {item.query}
                          <span className="text-muted-foreground">{item.resultCount}</span>
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Row label="Name" value={stats?.user.name ?? session?.user?.name ?? '—'} />
                <Row label="Email" value={stats?.user.email ?? session?.user?.email ?? '—'} />
                <Row label="Role" value={stats?.user.role === 'ADMIN' ? 'Administrator' : 'Shopper'} />
                <Row label="Plan" value="Free" />
              </dl>
              {stats?.user.role === 'ADMIN' ? (
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/admin">Open admin console</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favourites" className="mt-4">
          <FavoritesList />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <AlertsList />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {notifications.data
                ? `${notifications.data.unreadCount} unread of ${notifications.data.total}`
                : 'Loading notifications…'}
            </p>
            {notifications.data && notifications.data.unreadCount > 0 ? (
              <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
                <CheckCheck className="size-4" aria-hidden />
                Mark all read
              </Button>
            ) : null}
          </div>

          {notifications.isPending ? (
            <div className="space-y-3">
              {[0, 1].map((index) => (
                <Skeleton key={index} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : notifications.isError ? (
            <ErrorState title="Could not load notifications" onRetry={() => void notifications.refetch()} />
          ) : !notifications.data || notifications.data.items.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="When a price alert triggers, the notification will appear here."
            />
          ) : (
            <ul className="space-y-3">
              {notifications.data.items.map((item) => (
                <li key={item.id}>
                  <Card className={item.read ? undefined : 'border-primary/30 bg-primary/4'}>
                    <CardContent className="flex flex-wrap items-start gap-3 p-4">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Bell className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.message}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" aria-hidden />
                          {relativeTime(item.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!item.read ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markRead.mutate(item.id)}
                            disabled={markRead.isPending}
                          >
                            Mark read
                          </Button>
                        ) : (
                          <Badge variant="muted">Read</Badge>
                        )}
                        {item.link ? (
                          <Button asChild size="sm">
                            <Link href={item.link}>View product</Link>
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  pending,
}: {
  icon: typeof Heart
  label: string
  value?: number
  href?: string
  pending?: boolean
}) {
  const body = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-2xl font-bold tabular-nums">{pending ? '—' : (value ?? 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  )
}
