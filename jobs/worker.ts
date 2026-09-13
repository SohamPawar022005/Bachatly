import 'dotenv/config'
import { getQueue } from './queue'
import { runPriceUpdate } from './price-update'
import { runAlertCheck } from './alert-check'
import { runNotificationDigest } from './notification'
import { closePool } from '@/lib/db/pool'

/**
 * Worker entry point.
 *
 * With Redis: starts a BullMQ worker consuming queued jobs.
 * Without Redis: runs the same jobs on a local interval so the demo behaves
 * like the production pipeline.
 *
 *   pnpm jobs:worker
 */
async function main() {
  const queue = await getQueue()

  if (queue) {
    const segments = ['bullmq']
    const mod = (await import(/* webpackIgnore: true */ segments.join('/'))) as {
      Worker: new (
        name: string,
        processor: (job: { name: string; data: unknown }) => Promise<unknown>,
        opts: { connection: unknown },
      ) => { on: (event: string, cb: (...args: unknown[]) => void) => void }
    }
    const worker = new mod.Worker(
      process.env.BULLMQ_QUEUE_NAME ?? 'bachatly-jobs',
      async (job) => {
        if (job.name === 'price-update') return runPriceUpdate((job.data as { limit?: number }) ?? {})
        if (job.name === 'alert-check') return runAlertCheck()
        if (job.name === 'notification-digest') return runNotificationDigest()
        throw new Error(`Unknown job ${job.name}`)
      },
      { connection: { url: process.env.REDIS_URL } },
    )
    worker.on('completed', () => console.log('[worker] job completed'))
    worker.on('failed', (_job: unknown, err: unknown) => console.error('[worker] job failed', err))
    console.log('[worker] BullMQ worker started')
    return
  }

  const intervalMinutes = Number(process.env.WORKER_INTERVAL_MINUTES ?? 30)
  console.log(`[worker] Redis not configured — running jobs every ${intervalMinutes} minutes in-process`)
  const tick = async () => {
    try {
      const result = await runPriceUpdate({ triggeredBy: 'worker' })
      console.log(`[worker] price update: ${result.priceRecordsCreated} price records, ${result.alertsTriggered} alerts`)
    } catch (error) {
      console.error('[worker] price update failed', error)
    }
  }
  await tick()
  setInterval(tick, intervalMinutes * 60_000)
}

main().catch(async (error) => {
  console.error('[worker] fatal', error)
  await closePool()
  process.exit(1)
})

process.on('SIGTERM', async () => {
  await closePool()
  process.exit(0)
})
