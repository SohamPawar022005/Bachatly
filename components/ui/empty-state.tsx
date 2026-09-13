import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center', className)}>
      {Icon ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" aria-hidden />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {description ? <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
