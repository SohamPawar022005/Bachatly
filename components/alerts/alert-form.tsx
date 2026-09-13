'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BellRing } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { Spinner } from '@/components/ui/spinner'
import { formatPrice, parsePriceInput } from '@/lib/utils/money'

const schema = z.object({
  targetPrice: z
    .union([z.string(), z.number()])
    .refine((value) => {
      const parsed = parsePriceInput(value)
      return parsed !== null && parsed > 0
    }, 'Enter a target price in rupees'),
})

type FormValues = z.infer<typeof schema>

/**
 * "Alert me when this drops below ₹X".
 * Posts to /api/alerts; the alert is evaluated by the price-update job and the
 * moment it fires a notification is created server-side.
 */
export function AlertForm({
  variantId,
  variantTitle,
  currentPrice,
  onDone,
  compact = false,
}: {
  variantId: string
  variantTitle: string
  currentPrice: number | null
  onDone?: () => void
  compact?: boolean
}) {
  const { status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const suggested = currentPrice != null ? Math.max(1, Math.round((currentPrice * 0.9) / 100) * 100 / 100) : undefined

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { targetPrice: suggested ? String(suggested) : '' },
  })

  const mutation = useMutation({
    // The API takes the amount in rupees exactly as the user typed it and
    // converts to paise server-side (see alertCreateSchema).
    mutationFn: (values: FormValues) =>
      api.post<{ created: boolean; alreadyBelow: boolean }>('/api/alerts', {
        productVariantId: variantId,
        targetPrice: values.targetPrice,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] })
      void queryClient.invalidateQueries({ queryKey: ['account'] })
      void queryClient.invalidateQueries({ queryKey: ['product'] })
      toast({
        title: result.alreadyBelow ? 'Alert triggered immediately' : 'Price alert created',
        description: result.alreadyBelow
          ? 'The price is already at or below your target — check your notifications.'
          : "We'll notify you the moment it drops below your target.",
        variant: 'success',
      })
      onDone?.()
    },
    onError: (error: unknown) => {
      toast({
        title: 'Could not create alert',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      })
    },
  })

  if (status === 'loading') {
    return <Button variant="outline" className="w-full" disabled><Spinner /> Checking session…</Button>
  }

  if (status !== 'authenticated') {
    return (
      <Button variant="outline" className="w-full" onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent('/alerts')}`)}>
        <BellRing className="size-4" aria-hidden />
        Sign in to set price alerts
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="space-y-1.5">
        <Label htmlFor={`alert-${variantId}`}>Alert me below</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
          <Input
            id={`alert-${variantId}`}
            type="number"
            min={1}
            step={1}
            inputMode="decimal"
            placeholder={suggested ? String(suggested) : 'e.g. 59999'}
            className="pl-7"
            aria-invalid={Boolean(errors.targetPrice)}
            aria-describedby={errors.targetPrice ? `alert-${variantId}-error` : undefined}
            {...register('targetPrice')}
          />
        </div>
        {errors.targetPrice ? (
          <p id={`alert-${variantId}-error`} className="text-xs text-destructive">
            {errors.targetPrice.message}
          </p>
        ) : currentPrice != null ? (
          <p className="text-xs text-muted-foreground">
            Current lowest price is {formatPrice(currentPrice)}. A 10% drop would be about {formatPrice(Math.round(currentPrice * 0.9))}.
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? <Spinner /> : <BellRing className="size-4" aria-hidden />}
        {mutation.isPending ? 'Creating alert…' : 'Create price alert'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Watching: {variantTitle}</p>
    </form>
  )
}
