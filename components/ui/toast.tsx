'use client'

import * as React from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

const ICONS: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const idRef = React.useRef(0)

  const toast = React.useCallback<ToastContextValue['toast']>(({ title, description, variant = 'info' }) => {
    idRef.current += 1
    const id = idRef.current
    setItems((current) => [...current, { id, title, description, variant }])
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4500)
  }, [])

  const dismiss = (id: number) => setItems((current) => current.filter((item) => item.id !== id))
  const value = React.useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
        role="region"
        aria-live="polite"
      >
        {items.map((item) => {
          const Icon = ICONS[item.variant]
          return (
            <div
              key={item.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-lg',
                item.variant === 'error' && 'border-destructive/40',
                item.variant === 'success' && 'border-success/40',
              )}
            >
              <Icon
                className={cn(
                  'mt-0.5 size-5 shrink-0',
                  item.variant === 'error' && 'text-destructive',
                  item.variant === 'success' && 'text-success',
                  item.variant === 'info' && 'text-primary',
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
