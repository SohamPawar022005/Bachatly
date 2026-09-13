'use client'

import * as React from 'react'
import { ImageOff } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

/**
 * Product imagery.
 *
 * A plain <img> rather than next/image on purpose: the optimiser would fetch
 * the remote file on our server, which fails in offline/preview environments.
 * The browser loads it directly and falls back to a monogram tile if it cannot.
 */
export function ProductImage({
  src,
  alt,
  fallbackLabel,
  className,
  priority = false,
}: {
  src: string | null
  alt: string
  fallbackLabel: string
  className?: string
  priority?: boolean
}) {
  const [failed, setFailed] = React.useState(false)
  const initials = fallbackLabel
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.slice(0, 1))
    .join('')
    .toUpperCase()

  if (!src || failed) {
    return (
      <div className={cn('flex items-center justify-center bg-muted', className)} role="img" aria-label={alt}>
        <span className="flex flex-col items-center gap-1 text-muted-foreground">
          <ImageOff className="size-6" aria-hidden />
          <span className="text-xs font-semibold tracking-wide">{initials}</span>
        </span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}
