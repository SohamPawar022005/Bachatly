'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import * as React from 'react'

import { api } from '@/lib/api/client'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

/**
 * Save / unsave a product variant. Writes through the real API and invalidates
 * every list that shows favourites, so the UI never shows stale state.
 */
export function FavoriteButton({
  variantId,
  initialSaved = false,
  size = 'default',
  className,
  label = true,
}: {
  variantId: string
  initialSaved?: boolean
  size?: 'default' | 'sm' | 'icon'
  className?: string
  label?: boolean
}) {
  const { status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [saved, setSaved] = React.useState(initialSaved)

  React.useEffect(() => setSaved(initialSaved), [initialSaved, variantId])

  const mutation = useMutation({
    mutationFn: async () => {
      if (saved) {
        await api.delete<{ removed: boolean }>(`/api/favorites/${variantId}?variantId=${encodeURIComponent(variantId)}`)
        return false
      }
      await api.post<{ added: boolean }>('/api/favorites', { productVariantId: variantId })
      return true
    },
    onSuccess: (nowSaved) => {
      setSaved(nowSaved)
      void queryClient.invalidateQueries({ queryKey: ['favorites'] })
      void queryClient.invalidateQueries({ queryKey: ['account'] })
      void queryClient.invalidateQueries({ queryKey: ['product'] })
      toast({
        title: nowSaved ? 'Saved to favourites' : 'Removed from favourites',
        description: nowSaved ? "We'll keep tracking this price for you." : undefined,
        variant: nowSaved ? 'success' : 'info',
      })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not update favourites'
      toast({ title: 'Something went wrong', description: message, variant: 'error' })
    },
  })

  if (status === 'loading') {
    return <Button variant="outline" size={size === 'icon' ? 'icon-sm' : size} className={className} disabled aria-label="Save product" />
  }

  const onClick = () => {
    if (status !== 'authenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent('/favorites')}`)
      return
    }
    mutation.mutate()
  }

  return (
    <Button
      type="button"
      variant={saved ? 'secondary' : 'outline'}
      size={size === 'icon' ? 'icon-sm' : size}
      onClick={onClick}
      disabled={mutation.isPending}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from favourites' : 'Save to favourites'}
      title={saved ? 'Remove from favourites' : 'Save to favourites'}
      className={cn('gap-2', className)}
    >
      <Heart className={cn('size-4', saved && 'fill-current text-destructive')} aria-hidden />
      {label && size !== 'icon' ? <span>{saved ? 'Saved' : 'Save'}</span> : null}
    </Button>
  )
}
