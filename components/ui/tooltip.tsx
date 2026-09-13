'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '@/lib/utils/cn'

export const TooltipProvider = TooltipPrimitive.Provider
export const TooltipTrigger = TooltipPrimitive.Trigger

export function Tooltip({ children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
    </TooltipPrimitive.Root>
  )
}

export function TooltipContent({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-w-xs rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}
