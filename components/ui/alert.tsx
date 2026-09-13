import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

const alertVariants = cva('relative w-full rounded-lg border p-4 text-sm', {
  variants: {
    variant: {
      default: 'bg-card text-card-foreground',
      info: 'border-primary/25 bg-primary/8 text-foreground',
      success: 'border-success/30 bg-success/10 text-foreground',
      warning: 'border-warning/40 bg-warning/12 text-foreground',
      destructive: 'border-destructive/30 bg-destructive/8 text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

export function AlertTitle({ className, ...props }: React.ComponentProps<'h4'>) {
  return <h4 className={cn('mb-1 font-semibold', className)} {...props} />
}

export function AlertDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}
