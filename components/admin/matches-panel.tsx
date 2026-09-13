'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GitMerge, RotateCcw } from 'lucide-react'
import Link from 'next/link'

import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import type { AdminReviewItem } from '@/lib/ui/admin-types'

/** Identity-resolution review queue: listings the matcher was not confident about. */
export function MatchesPanel() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const queue = useQuery({
    queryKey: ['admin', 'matches'],
    queryFn: () => api.get<{ items: AdminReviewItem[] }>('/api/admin/matches'),
  })

  const reResolve = useMutation({
    mutationFn: (listingId: string) => api.post<{ score: number; status: string }>(`/api/admin/matches/${listingId}/resolve`),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'matches'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast({ title: `Re-resolved: ${result.status}`, description: `Confidence score ${result.score}`, variant: 'success' })
    },
    onError: (error: unknown) =>
      toast({ title: 'Re-resolution failed', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  if (queue.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }
  if (queue.isError) return <ErrorState title="Could not load the review queue" onRetry={() => void queue.refetch()} />

  const items = queue.data?.items ?? []
  if (items.length === 0) {
    return (
      <EmptyState
        icon={GitMerge}
        title="Review queue is empty"
        description="Every retailer listing resolved confidently to a canonical variant."
      />
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Retailer title</TableHead>
              <TableHead>Retailer</TableHead>
              <TableHead>Matched variant</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.listingId}>
                <TableCell>
                  <p className="max-w-md truncate">{item.rawTitle}</p>
                  <p className="max-w-md truncate font-mono text-xs text-muted-foreground">{item.normalizedTitle}</p>
                </TableCell>
                <TableCell className="text-sm">{item.retailerName}</TableCell>
                <TableCell>
                  <Link href={`/products/${item.variantSlug}`} className="text-sm hover:text-primary">
                    {item.variantTitle}
                  </Link>
                  <p className="text-xs text-muted-foreground">{item.productTitle}</p>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={item.score >= 70 ? 'success' : item.score >= 45 ? 'warning' : 'muted'}>{item.score}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" disabled={reResolve.isPending} onClick={() => reResolve.mutate(item.listingId)}>
                    <RotateCcw className="size-3.5" aria-hidden />
                    Re-resolve
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
