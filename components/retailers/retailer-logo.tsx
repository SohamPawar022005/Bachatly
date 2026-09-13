import { cn } from '@/lib/utils/cn'

/**
 * Retailers ship a brand colour, not a logo file, so we render a monogram tile
 * in that colour. Keeps the comparison table scannable and honest (no fake
 * third-party logos).
 */
export function RetailerLogo({
  name,
  brandColor,
  className,
}: {
  name: string
  brandColor?: string | null
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.slice(0, 1))
    .join('')
    .toUpperCase()

  return (
    <span
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white', className)}
      style={{ backgroundColor: brandColor ?? '#334155' }}
      aria-hidden
    >
      {initials}
    </span>
  )
}
