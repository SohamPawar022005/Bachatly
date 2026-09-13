import { db } from '@/lib/db/client'
import type { DatabaseClient } from '@/lib/db/types'
import { withClient } from '@/lib/db/query-helpers'
import { cuid } from '@/lib/utils/id'

export type NotificationType = 'PRICE_DROP' | 'ALERT_TRIGGERED' | 'DEAL' | 'SYSTEM'

export interface NotificationRow {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  metadata: Record<string, unknown> | null
  read: boolean
  createdAt: Date
}

const NOTIFICATION_SELECT = `
  n.id, n."userId", n.type, n.title, n.message, n.link, n.metadata, n.read, n."createdAt"
`

export async function createNotification(
  input: {
    userId: string
    type: NotificationType
    title: string
    message: string
    link?: string | null
    metadata?: Record<string, unknown> | null
  },
  client?: DatabaseClient,
): Promise<NotificationRow> {
  const c = await withClient(client)
  const row = await c.queryOne<NotificationRow>(
    `INSERT INTO notifications AS n (id, "userId", type, title, message, link, metadata, read, "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,false, now())
     RETURNING ${NOTIFICATION_SELECT}`,
    [cuid(), input.userId, input.type, input.title, input.message, input.link ?? null, JSON.stringify(input.metadata ?? null)],
  )
  return row!
}

export async function listNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number; offset?: number } = {},
): Promise<{ items: NotificationRow[]; total: number; unreadCount: number }> {
  const limit = options.limit ?? 25
  const offset = options.offset ?? 0
  const unreadFilter = options.unreadOnly ? `AND n.read = false` : ''
  const items = await db.query<NotificationRow>(
    `SELECT ${NOTIFICATION_SELECT} FROM notifications n
     WHERE n."userId" = $1 ${unreadFilter}
     ORDER BY n."createdAt" DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  )
  const counts = await db.queryOne<{ total: number; unread: number }>(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE n.read = false)::int AS unread
     FROM notifications n WHERE n."userId" = $1`,
    [userId],
  )
  return { items, total: counts?.total ?? 0, unreadCount: counts?.unread ?? 0 }
}

export async function markNotificationRead(id: string, userId: string): Promise<boolean> {
  const affected = await db.execute(
    `UPDATE notifications SET read = true WHERE id = $1 AND "userId" = $2 AND read = false`,
    [id, userId],
  )
  return affected > 0
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  return db.execute(`UPDATE notifications SET read = true WHERE "userId" = $1 AND read = false`, [userId])
}

export async function deleteNotification(id: string, userId: string): Promise<boolean> {
  const affected = await db.execute(`DELETE FROM notifications WHERE id = $1 AND "userId" = $2`, [id, userId])
  return affected > 0
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const row = await db.queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM notifications WHERE "userId" = $1 AND read = false`,
    [userId],
  )
  return row?.n ?? 0
}
