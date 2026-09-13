import { checkAlerts, type AlertCheckResult } from '@/services/alert-service'
import { closePool } from '@/lib/db/pool'

/**
 * Alert check job. Runs after every price update and can also be scheduled on
 * its own so alerts fire even when prices are refreshed by another system.
 */
export async function runAlertCheck(limit = 500): Promise<AlertCheckResult> {
  return checkAlerts(limit)
}

export async function runAlertCheckAndExit(limit = 500) {
  try {
    const result = await runAlertCheck(limit)
    console.log(`Alert check: ${result.checked} triggerable, ${result.notified} notifications sent`)
  } finally {
    await closePool()
  }
}
