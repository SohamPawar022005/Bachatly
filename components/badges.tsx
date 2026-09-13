import { Flame, PiggyBank, ShieldCheck, Trophy } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils/money'
import { cn } from '@/lib/utils/cn'

/** 🏆 The retailer offering the lowest effective price right now. */
export function LowestPriceBadge({ className }: { className?: string }) {
  return (
    <Badge variant="success" className={cn('gap-1 font-semibold', className)}>
      <Trophy className="size-3" aria-hidden />
      LOWEST PRICE
    </Badge>
  )
}

/** 🔥 A price that sits in the bottom 15% of its recorded range. */
export function GreatDealBadge({ className }: { className?: string }) {
  return (
    <Badge variant="destructive" className={cn('gap-1 font-semibold', className)}>
      <Flame className="size-3" aria-hidden />
      GREAT DEAL
    </Badge>
  )
}

/** 💰 How much cheaper this offer is than the next best one. */
export function SavingsBadge({ amount, className }: { amount: number; className?: string }) {
  if (amount <= 0) return null
  return (
    <Badge variant="secondary" className={cn('gap-1 font-semibold', className)}>
      <PiggyBank className="size-3" aria-hidden />
      SAVE {formatPrice(amount)}
    </Badge>
  )
}

/** ✓ Retailer publishes free delivery. */
export function FreeDeliveryBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn('gap-1 text-success', className)}>
      <ShieldCheck className="size-3" aria-hidden />
      FREE DELIVERY
    </Badge>
  )
}

/** Discount against the published MRP. */
export function DiscountBadge({ percent, className }: { percent: number; className?: string }) {
  if (!percent || percent <= 0) return null
  return (
    <Badge variant="destructive" className={className}>
      {percent}% OFF
    </Badge>
  )
}

/**
 * Every price in this app is timestamped demonstration data, never presented
 * as a live retailer quote — this badge keeps that visible to the user.
 */
export function DemoDataBadge({ className }: { className?: string }) {
  return (
    <Badge variant="muted" className={className}>
      Demo feed data
    </Badge>
  )
}
