/**
 * Job queue.
 *
 * With REDIS_URL set, the price-update job is queued through BullMQ with a
 * repeatable cron schedule (what runs in production). Without Redis — local
 * development, tests, the offline sandbox — jobs are triggered manually
 * (`pnpm jobs:price-update`) or by the in-process scheduler started by
 * `pnpm jobs:worker`. The job logic itself is identical either way.
 */

export type JobName = 'price-update' | 'alert-check' | 'notification-digest'

interface QueueLike {
  upsertJobScheduler(id: string, opts: { pattern: string }, job: { name: string; data?: unknown }): Promise<unknown>
  add(name: string, data?: unknown): Promise<unknown>
  close(): Promise<void>
}

let queue: QueueLike | null = null
let tried = false

export async function getQueue(): Promise<QueueLike | null> {
  if (tried) return queue
  tried = true
  if (!process.env.REDIS_URL) return null
  try {
    const segments = ['bullmq']
    const mod = (await import(/* webpackIgnore: true */ segments.join('/'))) as {
      Queue: new (name: string, opts: { connection: unknown }) => QueueLike
    }
    queue = new mod.Queue(process.env.BULLMQ_QUEUE_NAME ?? 'bachatly-jobs', {
      connection: { url: process.env.REDIS_URL },
    })
  } catch {
    queue = null
  }
  return queue
}

export async function enqueuePriceUpdate(data?: { limit?: number; triggeredBy?: string }) {
  const q = await getQueue()
  if (!q) return { queued: false, reason: 'Redis not configured — run jobs manually or start the worker' }
  await q.add('price-update', { ...(data ?? {}), triggeredBy: data?.triggeredBy ?? 'api' })
  return { queued: true }
}

export async function scheduleRecurringJobs(pattern = process.env.PRICE_UPDATE_CRON ?? '*/30 * * * *') {
  const q = await getQueue()
  if (!q) return { scheduled: false }
  await q.upsertJobScheduler('price-update-schedule', { pattern }, { name: 'price-update' })
  await q.upsertJobScheduler('alert-check-schedule', { pattern: '*/15 * * * *' }, { name: 'alert-check' })
  return { scheduled: true, pattern }
}
