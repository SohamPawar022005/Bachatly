'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import * as React from 'react'

import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { relativeTime } from '@/lib/utils/time'
import type { AdminUserRow } from '@/lib/ui/admin-types'

/** User directory with role management. */
export function UsersPanel() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [term, setTerm] = React.useState('')
  const [debounced, setDebounced] = React.useState('')

  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(term), 250)
    return () => clearTimeout(handle)
  }, [term])

  const users = useQuery({
    queryKey: ['admin', 'users', debounced],
    queryFn: () => api.get<{ items: AdminUserRow[]; total: number }>(`/api/admin/users?q=${encodeURIComponent(debounced)}`),
  })

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'ADMIN' }) => api.patch(`/api/admin/users/${id}`, { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({ title: 'Role updated', variant: 'success' })
    },
    onError: (error: unknown) =>
      toast({ title: 'Could not update role', description: error instanceof Error ? error.message : undefined, variant: 'error' }),
  })

  return (
    <div className="space-y-4">
      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search by name or email" className="pl-9" aria-label="Search users" />
      </div>

      {users.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : users.isError ? (
        <ErrorState title="Could not load users" onRetry={() => void users.refetch()} />
      ) : !users.data || users.data.items.length === 0 ? (
        <EmptyState icon={Users} title="No users matched" description="Try a different name or email." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Favourites</TableHead>
                  <TableHead className="text-right">Alerts</TableHead>
                  <TableHead className="text-right">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{relativeTime(user.createdAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{user.favoriteCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{user.alertCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'muted'}>{user.role}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={setRole.isPending}
                          onClick={() => setRole.mutate({ id: user.id, role: user.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                        >
                          {user.role === 'ADMIN' ? 'Make shopper' : 'Make admin'}
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
