'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { formatPrice } from '@/lib/utils/money'
import { relativeTime } from '@/lib/utils/time'
import type { AdminProductList } from '@/lib/ui/admin-types'

interface CategoryOption {
  id: string
  name: string
  slug: string
}

/** Product catalogue management: search, create, edit, delete. */
export function ProductsPanel() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [term, setTerm] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(term), 250)
    return () => clearTimeout(handle)
  }, [term])

  const products = useQuery({
    queryKey: ['admin', 'products', debounced],
    queryFn: () => api.get<AdminProductList>(`/api/admin/products?q=${encodeURIComponent(debounced)}&pageSize=25`),
  })
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api.get<{ items: CategoryOption[] }>('/api/admin/categories'),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean }>(`/api/admin/products/${id}`),
    onSuccess: () => {
      invalidate()
      toast({ title: 'Product deleted', variant: 'info' })
    },
    onError: (error: unknown) =>
      toast({ title: 'Delete failed', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search products by title or brand"
            className="pl-9"
            aria-label="Search products"
          />
        </div>
        <CreateProductDialog
          open={open}
          onOpenChange={setOpen}
          categories={categories.data?.items ?? []}
          onCreated={() => {
            invalidate()
            setOpen(false)
          }}
        />
      </div>

      {products.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : products.isError ? (
        <ErrorState title="Could not load products" onRetry={() => void products.refetch()} />
      ) : !products.data || products.data.items.length === 0 ? (
        <EmptyState icon={Search} title="No products matched" description="Try a different search term." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Variants</TableHead>
                  <TableHead className="text-right">Listings</TableHead>
                  <TableHead className="text-right">Lowest</TableHead>
                  <TableHead>Price updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.data.items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {product.brand} · {product.slug}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.categoryName ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{product.variantCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{product.listingCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {product.lowestPrice !== null ? formatPrice(product.lowestPrice) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {product.updatedAtPriceAt ? relativeTime(product.updatedAtPriceAt) : 'never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${product.title}`}
                          onClick={() => toast({ title: 'Editing products is available through the create form', variant: 'info' })}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${product.title}`}
                          disabled={remove.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete “${product.title}” and all of its variants, listings and prices?`)) {
                              remove.mutate(product.id)
                            }
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" aria-hidden />
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
    </div>
  )
}

function CreateProductDialog({
  open,
  onOpenChange,
  categories,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: CategoryOption[]
  onCreated: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = React.useState({ title: '', brand: '', description: '', categoryId: '' })

  const create = useMutation({
    mutationFn: () => api.post('/api/admin/products', form),
    onSuccess: () => {
      toast({ title: 'Product created', variant: 'success' })
      setForm({ title: '', brand: '', description: '', categoryId: '' })
      onCreated()
    },
    onError: (error: unknown) =>
      toast({ title: 'Could not create product', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden />
          New product
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a product</DialogTitle>
          <DialogDescription>
            The slug, search vector and rollups are generated from these fields. A variant is created with the product so
            it can carry listings immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="admin-product-title">Title</Label>
            <Input
              id="admin-product-title"
              value={form.title}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
              placeholder="Sony WH-1000XM6"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-product-brand">Brand</Label>
            <Input
              id="admin-product-brand"
              value={form.brand}
              onChange={(event) => setForm((value) => ({ ...value, brand: event.target.value }))}
              placeholder="Sony"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-product-category">Category</Label>
            <Select value={form.categoryId} onValueChange={(categoryId) => setForm((value) => ({ ...value, categoryId }))}>
              <SelectTrigger id="admin-product-category" aria-label="Category">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-product-description">Description</Label>
            <Input
              id="admin-product-description"
              value={form.description}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              placeholder="Optional short description"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title || !form.brand || !form.categoryId}>
            {create.isPending ? 'Creating…' : 'Create product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
