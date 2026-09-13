'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Store } from 'lucide-react'
import * as React from 'react'

import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RetailerLogo } from '@/components/retailers/retailer-logo'
import { useToast } from '@/components/ui/toast'
import type { AdminRetailerRow } from '@/lib/ui/admin-types'

/** Retailer registry: activate/deactivate retailers and register affiliate config. */
export function RetailersPanel() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)

  const retailers = useQuery({
    queryKey: ['admin', 'retailers'],
    queryFn: () => api.get<{ items: AdminRetailerRow[] }>('/api/admin/retailers'),
  })

  const toggle = useMutation({
    mutationFn: (retailer: AdminRetailerRow) =>
      api.patch(`/api/admin/retailers/${retailer.id}`, { isActive: !retailer.isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'retailers'] })
      toast({ title: 'Retailer updated', variant: 'success' })
    },
    onError: (error: unknown) =>
      toast({ title: 'Could not update retailer', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Deactivating a retailer removes its listings from every comparison immediately.
        </p>
        <CreateRetailerDialog open={open} onOpenChange={setOpen} onCreated={() => setOpen(false)} />
      </div>

      {retailers.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : retailers.isError ? (
        <ErrorState title="Could not load retailers" onRetry={() => void retailers.refetch()} />
      ) : !retailers.data || retailers.data.items.length === 0 ? (
        <EmptyState icon={Store} title="No retailers" description="Add a retailer to start tracking listings." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Retailer</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retailers.data.items.map((retailer) => (
                  <TableRow key={retailer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <RetailerLogo name={retailer.name} brandColor={retailer.brandColor} className="size-8 text-[10px]" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{retailer.name}</p>
                          <a
                            href={retailer.websiteUrl}
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            className="truncate text-xs text-muted-foreground hover:text-foreground"
                          >
                            {retailer.websiteUrl}
                          </a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{retailer.slug}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {retailer.affiliateNetwork ? `${retailer.affiliateNetwork} · ${retailer.affiliateId ?? '—'}` : 'none'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge variant={retailer.isActive ? 'success' : 'muted'}>{retailer.isActive ? 'active' : 'inactive'}</Badge>
                        <Switch
                          checked={retailer.isActive}
                          onCheckedChange={() => toggle.mutate(retailer)}
                          aria-label={`Toggle ${retailer.name}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CreateRetailerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({ name: '', websiteUrl: '', brandColor: '#111827', affiliateNetwork: '', affiliateId: '' })

  const create = useMutation({
    mutationFn: () => api.post('/api/admin/retailers', form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'retailers'] })
      toast({ title: 'Retailer added', variant: 'success' })
      setForm({ name: '', websiteUrl: '', brandColor: '#111827', affiliateNetwork: '', affiliateId: '' })
      onCreated()
    },
    onError: (error: unknown) =>
      toast({ title: 'Could not add retailer', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden />
          New retailer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a retailer</DialogTitle>
          <DialogDescription>
            Retailers appear in comparisons and filters. Affiliate fields are optional and are used to build Buy Now
            links without hiding where the user is going.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="admin-retailer-name">Name</Label>
            <Input id="admin-retailer-name" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="Vijay Sales" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-retailer-url">Website URL</Label>
            <Input id="admin-retailer-url" value={form.websiteUrl} onChange={(event) => setForm((value) => ({ ...value, websiteUrl: event.target.value }))} placeholder="https://www.vijaysales.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-retailer-color">Brand colour</Label>
              <Input id="admin-retailer-color" value={form.brandColor} onChange={(event) => setForm((value) => ({ ...value, brandColor: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-retailer-network">Affiliate network</Label>
              <Input id="admin-retailer-network" value={form.affiliateNetwork} onChange={(event) => setForm((value) => ({ ...value, affiliateNetwork: event.target.value }))} placeholder="optional" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name || !form.websiteUrl}>
            {create.isPending ? 'Adding…' : 'Add retailer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
