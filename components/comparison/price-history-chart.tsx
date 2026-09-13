'use client'

import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, Flame, LineChart as LineIcon, Minus, TriangleAlert, TrendingDown, TrendingUp } from 'lucide-react'

import { api } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils/money'
import type { UiHistoryResponse, UiVerdict } from '@/lib/ui/types'
import { cn } from '@/lib/utils/cn'

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
] as const

const VERDICT_ICON: Record<UiVerdict, typeof Flame> = {
  GREAT: Flame,
  GOOD: TrendingDown,
  AVERAGE: Minus,
  HIGH: TriangleAlert,
}

const VERDICT_STYLE: Record<UiVerdict, string> = {
  GREAT: 'border-success/40 bg-success/10 text-success',
  GOOD: 'border-primary/25 bg-primary/8 text-primary',
  AVERAGE: 'border-border bg-muted text-muted-foreground',
  HIGH: 'border-destructive/30 bg-destructive/8 text-destructive',
}

/**
 * Price history for one variant, drawn from the stored price records.
 * The verdict (GREAT / GOOD / AVERAGE / HIGH) is computed server-side from the
 * same records — the chart only renders it.
 */
export function PriceHistoryChart({ variantSlug }: { variantSlug: string }) {
  const [days, setDays] = React.useState<number>(30)
  const [showRetailers, setShowRetailers] = React.useState(false)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['history', variantSlug, days],
    queryFn: () => api.get<UiHistoryResponse>(`/api/products/${variantSlug}/history?days=${days}`),
  })

  const classification = data?.classification
  const VerdictIcon = classification ? VERDICT_ICON[classification.verdict] : BarChart3

  const chartData = React.useMemo(() => {
    if (!data) return []
    const windowDays = data.days
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000
    return data.cheapestSeries
      .filter((point) => new Date(point.date).getTime() >= cutoff)
      .map((point) => ({
        date: point.date,
        price: point.price / 100,
        label: new Date(point.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      }))
  }, [data])

  const domain = React.useMemo<[number, number]>(() => {
    const prices = chartData.map((point) => point.price)
    if (prices.length === 0) return [0, 1]
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const pad = Math.max(50, (max - min) * 0.15)
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)]
  }, [chartData])

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">Price history</CardTitle>
          <CardDescription>
            {data
              ? `${data.stats.sampleSize} recorded price points · freshness: ${data.freshness.label}`
              : 'Loading history…'}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="History range">
            {RANGES.map((range) => (
              <button
                key={range.days}
                type="button"
                onClick={() => setDays(range.days)}
                aria-pressed={days === range.days}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  days === range.days ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-pressed={showRetailers}
            onClick={() => setShowRetailers((value) => !value)}
          >
            <LineIcon className="size-3.5" aria-hidden />
            {showRetailers ? 'Cheapest only' : 'By retailer'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <ErrorState title="History unavailable" message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
        ) : chartData.length === 0 ? (
          <EmptyState icon={BarChart3} title="No history in this range" description="Try a longer range — price records are recorded once per check." />
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {showRetailers && data ? (
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} minTickGap={24} />
                    <YAxis
                      domain={domain}
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      width={72}
                      tickFormatter={(value: number) => formatPrice(Math.round(value * 100))}
                    />
                    <Tooltip content={<PriceTooltip />} />
                    {data.series.slice(0, 6).map((series) => (
                      <Line
                        key={series.retailerSlug}
                        type="monotone"
                        dataKey="price"
                        data={series.points
                          .filter((point) => new Date(point.date).getTime() >= Date.now() - days * 86_400_000)
                          .map((point) => ({
                            date: point.date,
                            price: point.price / 100,
                            label: new Date(point.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                            retailer: series.retailer,
                          }))}
                        stroke={series.color}
                        strokeWidth={2}
                        dot={false}
                        name={series.retailer}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} minTickGap={24} />
                    <YAxis
                      domain={domain}
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      width={72}
                      tickFormatter={(value: number) => formatPrice(Math.round(value * 100))}
                    />
                    <Tooltip content={<PriceTooltip />} />
                    <Area type="monotone" dataKey="price" stroke="var(--primary)" strokeWidth={2} fill="url(#priceFill)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Lowest recorded" value={data?.stats.lowest != null ? formatPrice(data.stats.lowest) : '—'} />
              <Stat label="Highest recorded" value={data?.stats.highest != null ? formatPrice(data.stats.highest) : '—'} />
              <Stat label="Average" value={data?.stats.average != null ? formatPrice(data.stats.average) : '—'} />
              <Stat
                label="vs average"
                value={
                  classification
                    ? `${classification.vsAveragePercent > 0 ? '+' : ''}${classification.vsAveragePercent.toFixed(1)}%`
                    : '—'
                }
              />
            </dl>
          </>
        )}

        {classification ? (
          <div className={cn('flex flex-wrap items-start gap-3 rounded-lg border p-3 text-sm', VERDICT_STYLE[classification.verdict])}>
            <VerdictIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {classification.label}
                {classification.current ? ` · ${formatPrice(classification.current)}` : ''}
              </p>
              <p className="text-xs opacity-90">{classification.reason}</p>
            </div>
            <Badge variant="outline" className="shrink-0 border-current">
              {classification.confidence} confidence · {classification.sampleSize} samples
            </Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function PriceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number; name?: string; dataKey?: string | number; payload?: { retailer?: string } }>
  label?: string | number
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((entry, index) => (
        <p key={`${entry.name ?? entry.dataKey}-${index}`} className="flex items-center gap-2">
          {entry.payload?.retailer ?? entry.name ?? 'Price'}:{' '}
          <span className="font-semibold tabular-nums">
            {formatPrice(Math.round((entry.value ?? 0) * 100))}
          </span>
        </p>
      ))}
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
        <TrendingUp className="size-3" aria-hidden />
        Cheapest effective price that day
      </p>
    </div>
  )
}
