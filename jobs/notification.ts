import { listNotifications } from '@/lib/db/repositories/notification-repository'
import { findUserById } from '@/lib/db/repositories/user-repository'
import { db } from '@/lib/db/client'
import { closePool } from '@/lib/db/pool'

/**
 * Notification digest job.
 *
 * In-app notifications are written synchronously by the services that raise
 * them. This job is the optional email path: it batches unread price alerts
 * into one digest per user and only sends anything when an email provider is
 * configured.
 */

export interface DigestSummary {
  users: number
  notifications: number
  emailed: number
  emailEnabled: boolean
}

export async function runNotificationDigest(): Promise<DigestSummary> {
  const emailEnabled = Boolean(process.env.RESEND_API_KEY)
  const users = await db.query<{ id: string; unread: number }>(
    `SELECT "userId" AS id, count(*)::int AS unread
     FROM notifications WHERE read = false AND type = 'ALERT_TRIGGERED'
     GROUP BY "userId"`,
  )

  let emailed = 0
  let notifications = 0

  for (const user of users) {
    const { items } = await listNotifications(user.id, { unreadOnly: true, limit: 20 })
    const priceAlerts = items.filter((n) => n.type === 'ALERT_TRIGGERED')
    notifications += priceAlerts.length
    if (!emailEnabled || priceAlerts.length === 0) continue

    const profile = await findUserById(user.id)
    if (!profile?.email) continue
    const sent = await sendDigest(profile.email, profile.name, priceAlerts.map((n) => `${n.title}: ${n.message}`))
    if (sent) emailed++
  }

  return { users: users.length, notifications, emailed, emailEnabled }
}

async function sendDigest(email: string, name: string, lines: string[]): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false
  try {
    const segments = ['resend']
    const mod = (await import(/* webpackIgnore: true */ segments.join('/'))) as {
      Resend: new (key: string) => { emails: { send: (input: unknown) => Promise<unknown> } }
    }
    const resend = new mod.Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Bachatly <alerts@bachatly.app>',
      to: email,
      subject: `Bachatly: ${lines.length} price drop${lines.length === 1 ? '' : 's'} on products you follow`,
      text: `Hi ${name},\n\n${lines.join('\n')}\n\n— Bachatly`,
    })
    return true
  } catch {
    return false
  }
}

export async function runNotificationDigestAndExit() {
  try {
    const summary = await runNotificationDigest()
    console.log(
      `Notification digest: ${summary.users} users with unread alerts, ${summary.notifications} notifications, ${summary.emailed} emails sent (provider ${summary.emailEnabled ? 'configured' : 'not configured'})`,
    )
  } finally {
    await closePool()
  }
}
