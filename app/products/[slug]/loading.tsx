import { Skeleton } from '@/components/ui/skeleton'

export default function ProductLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
