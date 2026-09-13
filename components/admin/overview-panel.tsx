'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  Boxes,
  Building2,
  CheckCircle2,
  Database,
  Gauge,
  RefreshCw,
  TriangleAlert,
  Users,
} from 'lucide-react'
import * as React from 'react'

import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { relativeTime } from '@/lib/utils/time'
import type { AdminHealth, AdminPriceUpdateResult, AdminStats } from '@/lib/ui/admin-types'

/** Admin overview: live counts, service health and the price-update job runner. */
export function OverviewPanel() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [simulate, setSimulate] = React.useState<'none' | 'random' | 'drop' | 'rise'>('drop')
  const [limit, setLimit] = React.useState('30')

  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api.get<AdminStats>('/api/admin/stats') })
  const health = useQuery({ queryKey: ['admin', 'health'], queryFn: () => api.get<AdminHealth>('/api/admin/health') })

  const runJob = useMutation({
    mutationFn: () =>
      api.post<AdminPriceUpdateResult>('/api/admin/prices/update', {
        mode: 'job',
        limit: Number(limit) || 30,
        triggeredBy: 'admin',
        simulateChange: simulate,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast({
        title: 'Price update finished',
        description: `${result.listingsChecked} listings checked, ${result.priceRecordsCreated} price records, ${result.alertsTriggered} alerts triggered in ${result.durationMs}ms`,
        variant: 'success',
      })
    },
    onError: (error: unknown) =>
      toast({ title: 'Job failed', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  if (stats.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }
  if (stats.isError) {
    return <ErrorState title="Could not load admin stats" message={stats.error instanceof Error ? stats.error.message : undefined} onRetry={() => void stats.refetch()} />
  }

  const data = stats.data
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={Boxes} label="Products" value={data.totalProducts} hint={`${data.totalVariants} variants`} />
        <Tile icon={Building2} label="Retailers" value={data.totalRetailers} hint={`${data.activeRetailers} active`} />
        <Tile icon={Database} label="Price records" value={data.totalPriceRecords} hint={`${data.listingsCheckedToday} checked today`} />
        <Tile icon={Users} label="Users" value={data.totalUsers} hint={`${data.totalFavorites} favourites`} />
        <Tile icon={Activity} label="Listings" value={data.totalListings} hint={`${data.activeAlerts} active alerts`} />
        <Tile icon={TriangleAlert} label="Pending matches" value={data.pendingMatches} hint={`${data.unmatchedListings} unmatched`} />
        <Tile icon={CheckCircle2} label="Notifications" value={data.notificationsSent} hint="all time" />
        <Tile icon={Gauge} label="Updated today" value={data.productsUpdatedToday} hint="products" />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Run the price-update job</CardTitle>
            <CardDescription>
              Calls the retailer adapters, appends new price records, refreshes rollups and evaluates price alerts. Use
              the simulated change to demonstrate a drop end-to-end.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={simulate} onValueChange={(value) => setSimulate(value as typeof simulate)}>
              <SelectTrigger size="sm" className="w-44" aria-label="Simulated price change">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No change (real feed)</SelectItem>
                <SelectItem value="drop">Simulate 10% drop</SelectItem>
                <SelectItem value="rise">Simulate 7% rise</SelectItem>
                <SelectItem value="random">Random jitter</SelectItem>
              </SelectContent>
            </Select>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger size="sm" className="w-32" aria-label="Listings to check">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['10', '30', '60', '120'].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value} listings
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => runJob.mutate()} disabled={runJob.isPending}>
              <RefreshCw className={runJob.isPending ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
              {runJob.isPending ? 'Running…' : 'Run now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead className="text-right">Checked</TableHead>
                <TableHead className="text-right">Prices</TableHead>
                <TableHead className="text-right">Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No job runs recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.recentRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{relativeTime(run.startedAt)}</TableCell>
                    <TableCell>
                      <Badge variant={run.status === 'SUCCESS' ? 'success' : 'destructive'}>{run.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{run.triggeredBy ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{run.listingsChecked}</TableCell>
                    <TableCell className="text-right tabular-nums">{run.priceRecordsCreated}</TableCell>
                    <TableCell className="text-right tabular-nums">{run.alertsTriggered}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retailer adapters</CardTitle>
            <CardDescription>Every adapter in this build is a labelled demonstration feed.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.adapters.map((adapter) => (
                <li key={adapter.slug} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{adapter.name}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="muted">{adapter.source}</Badge>
                    <Badge variant={adapter.live ? 'success' : 'outline'}>{adapter.live ? 'live' : 'mock'}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">System health</CardTitle>
            <CardDescription>
              {health.data
                ? `Database ${health.data.database} in ${health.data.latencyMs}ms · queue: ${health.data.queue}`
                : 'Checking…'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(health.data?.services ?? data.services).map((service) => (
                <li key={service.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{service.name}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {service.detail ? <span className="text-xs">{service.detail}</span> : null}
                    <Badge variant={service.configured ? 'success' : 'muted'}>
                      {service.configured ? 'configured' : 'not configured'}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Optional services degrade gracefully: when Redis, Resend, Cloudinary or Sentry are not configured the app
              falls back to in-process equivalents or disables that feature.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Boxes
  label: string
  value: number
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums">{value.toLocaleString('en-IN')}</p>
          <p className="truncate text-xs text-muted-foreground">
            {label}
            {hint ? ` · ${hint}` : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
