'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { History, IndianRupee } from 'lucide-react'
import * as React from 'react'

import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { formatPrice } from '@/lib/utils/money'
import { relativeTime } from '@/lib/utils/time'
import type { AdminListingRow, AdminPriceHistoryRow, AdminRetailerRow } from '@/lib/ui/admin-types'

const STATUS_VARIANT: Record<AdminListingRow['resolutionStatus'], 'success' | 'warning' | 'muted'> = {
  RESOLVED: 'success',
  PENDING: 'warning',
  UNMATCHED: 'muted',
}

/** Retailer listings: identity-resolution status, latest price, manual price entry. */
export function ListingsPanel() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [status, setStatus] = React.useState<'ALL' | 'RESOLVED' | 'PENDING' | 'UNMATCHED'>('ALL')
  const [priceFor, setPriceFor] = React.useState<AdminListingRow | null>(null)
  const [historyFor, setHistoryFor] = React.useState<AdminListingRow | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  const listings = useQuery({
    queryKey: ['admin', 'listings', status],
    queryFn: () =>
      api.get<AdminListingRow[]>(`/api/admin/listings${status === 'ALL' ? '' : `?resolutionStatus=${status}`}`),
  })
  const retailers = useQuery({
    queryKey: ['admin', 'retailers'],
    queryFn: () => api.get<{ items: AdminRetailerRow[] }>('/api/admin/retailers'),
  })

  const recordPrice = useMutation({
    mutationFn: (payload: {
      listingId: string
      price: string
      mrp: string
      deliveryFee: string
      availability: string
    }) =>
      api.post('/api/admin/prices/update', {
        listingId: payload.listingId,
        price: payload.price,
        mrp: payload.mrp || undefined,
        deliveryFee: payload.deliveryFee === '' ? undefined : payload.deliveryFee,
        availability: payload.availability,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      setPriceFor(null)
      toast({
        title: 'Price recorded',
        description: 'Rollups refreshed and alerts evaluated. Historical prices are never overwritten.',
        variant: 'success',
      })
    },
    onError: (error: unknown) =>
      toast({ title: 'Could not record price', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <SelectTrigger size="sm" className="w-48" aria-label="Filter by resolution status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="PENDING">Pending review</SelectItem>
            <SelectItem value="UNMATCHED">Unmatched</SelectItem>
          </SelectContent>
        </Select>
        <CreateListingDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          retailers={retailers.data?.items ?? []}
          onCreated={() => setCreateOpen(false)}
        />
      </div>

      {listings.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : listings.isError ? (
        <ErrorState title="Could not load listings" onRetry={() => void listings.refetch()} />
      ) : !listings.data || listings.data.length === 0 ? (
        <EmptyState icon={IndianRupee} title="No listings" description="No listings match this filter." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Retailer</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead className="text-right">Latest price</TableHead>
                  <TableHead>Checked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.data.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.retailerName}</TableCell>
                    <TableCell>
                      <p className="truncate">{listing.variantTitle}</p>
                      <p className="truncate text-xs text-muted-foreground">{listing.productTitle}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[listing.resolutionStatus]}>
                        {listing.resolutionStatus.toLowerCase()}
                      </Badge>
                      <span className="ml-2 text-xs text-muted-foreground">{listing.matchConfidence}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {listing.latestEffectivePrice !== null ? formatPrice(listing.latestEffectivePrice) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {listing.lastCheckedAt ? relativeTime(listing.lastCheckedAt) : 'never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => setPriceFor(listing)}>
                          <IndianRupee className="size-3.5" aria-hidden />
                          Price
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`History for ${listing.variantTitle}`} onClick={() => setHistoryFor(listing)}>
                          <History className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(priceFor)} onOpenChange={(open) => !open && setPriceFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a new price</DialogTitle>
            <DialogDescription>
              {priceFor ? `${priceFor.retailerName} · ${priceFor.variantTitle}` : ''}. Prices are append-only: this adds a
              new record, refreshes the variant rollups and evaluates price alerts.
            </DialogDescription>
          </DialogHeader>
          {priceFor ? (
            <RecordPriceForm
              onSubmit={(values) => recordPrice.mutate({ ...values, listingId: priceFor.id })}
              pending={recordPrice.isPending}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyFor)} onOpenChange={(open) => !open && setHistoryFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Price history</DialogTitle>
            <DialogDescription>
              {historyFor ? `${historyFor.retailerName} · ${historyFor.variantTitle}` : ''}
            </DialogDescription>
          </DialogHeader>
          {historyFor ? <PriceHistoryTable listingId={historyFor.id} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RecordPriceForm({
  onSubmit,
  pending,
}: {
  onSubmit: (values: { price: string; mrp: string; deliveryFee: string; availability: string }) => void
  pending: boolean
}) {
  const [values, setValues] = React.useState({ price: '', mrp: '', deliveryFee: '', availability: 'IN_STOCK' })
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(values)
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="admin-price">Price (₹)</Label>
          <Input id="admin-price" value={values.price} onChange={(event) => setValues((v) => ({ ...v, price: event.target.value }))} placeholder="64999" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-mrp">MRP (₹)</Label>
          <Input id="admin-mrp" value={values.mrp} onChange={(event) => setValues((v) => ({ ...v, mrp: event.target.value }))} placeholder="79900" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-delivery">Delivery fee (₹, blank = unknown)</Label>
          <Input id="admin-delivery" value={values.deliveryFee} onChange={(event) => setValues((v) => ({ ...v, deliveryFee: event.target.value }))} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-availability">Availability</Label>
          <Select value={values.availability} onValueChange={(availability) => setValues((v) => ({ ...v, availability }))}>
            <SelectTrigger id="admin-availability" aria-label="Availability">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IN_STOCK">In stock</SelectItem>
              <SelectItem value="LOW_STOCK">Low stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
              <SelectItem value="PREORDER">Pre-order</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || !values.price}>
          {pending ? 'Recording…' : 'Record price'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function PriceHistoryTable({ listingId }: { listingId: string }) {
  const history = useQuery({
    queryKey: ['admin', 'prices', listingId],
    queryFn: () => api.get<{ items: AdminPriceHistoryRow[] }>(`/api/admin/prices?listingId=${listingId}&days=90`),
  })

  if (history.isPending) return <Skeleton className="h-40 w-full" />
  if (history.isError) return <ErrorState title="Could not load history" onRetry={() => void history.refetch()} />
  const items = history.data?.items ?? []
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No price records for this listing.</p>

  return (
    <div className="max-h-96 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Checked</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">MRP</TableHead>
            <TableHead className="text-right">Delivery</TableHead>
            <TableHead className="text-right">Effective</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.slice(0, 40).map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-xs">{relativeTime(row.checkedAt)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatPrice(row.price)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {row.mrp !== null ? formatPrice(row.mrp) : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {row.deliveryFee !== null ? formatPrice(row.deliveryFee) : '—'}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatPrice(row.effectivePrice)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.source}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-2 text-xs text-muted-foreground">
        Showing the {Math.min(40, items.length)} most recent of {items.length} records in the last 90 days.
      </p>
    </div>
  )
}

function CreateListingDialog({
  open,
  onOpenChange,
  retailers,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  retailers: AdminRetailerRow[]
  onCreated: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    productVariantId: '',
    retailerId: '',
    retailerProductId: '',
    url: '',
    price: '',
  })

  const create = useMutation({
    mutationFn: () => api.post('/api/admin/listings', form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast({
        title: 'Listing created',
        description: 'Identity resolution ran against it — check the resolution column for the result.',
        variant: 'success',
      })
      setForm({ productVariantId: '', retailerId: '', retailerProductId: '', url: '', price: '' })
      onCreated()
    },
    onError: (error: unknown) =>
      toast({ title: 'Could not create listing', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a retailer listing</DialogTitle>
          <DialogDescription>
            Paste the variant id (from the products table) and the retailer&rsquo;s own product id. Identity resolution
            scores it against the catalogue and records the decision.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="admin-listing-variant">Product variant id</Label>
            <Input id="admin-listing-variant" value={form.productVariantId} onChange={(event) => setForm((v) => ({ ...v, productVariantId: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-listing-retailer">Retailer</Label>
            <Select value={form.retailerId} onValueChange={(retailerId) => setForm((v) => ({ ...v, retailerId }))}>
              <SelectTrigger id="admin-listing-retailer" aria-label="Retailer">
                <SelectValue placeholder="Choose a retailer" />
              </SelectTrigger>
              <SelectContent>
                {retailers.map((retailer) => (
                  <SelectItem key={retailer.id} value={retailer.id}>
                    {retailer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-listing-rpid">Retailer product id</Label>
            <Input id="admin-listing-rpid" value={form.retailerProductId} onChange={(event) => setForm((v) => ({ ...v, retailerProductId: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-listing-price">Price (₹)</Label>
            <Input id="admin-listing-price" value={form.price} onChange={(event) => setForm((v) => ({ ...v, price: event.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || !form.productVariantId || !form.retailerId || !form.retailerProductId}
          >
            {create.isPending ? 'Creating…' : 'Create listing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
