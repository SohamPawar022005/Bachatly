import {
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationType,
} from '@/lib/db/repositories/notification-repository'
import { findUserByEmail } from '@/lib/db/repositories/user-repository'
import { formatPrice } from '@/lib/utils/money'

/**
 * Notification service.
 *
 * In-app notifications are the primary channel. Email delivery is an optional
 * transport (Resend) that is only used when RESEND_API_KEY is configured, so
 * the app works fully without it.
 */

export interface NotifyInput {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string | null
  metadata?: Record<string, unknown> | null
  /** Send a transactional email too (only when an email provider is configured). */
  email?: boolean
}

let resendClient: { emails: { send: (input: unknown) => Promise<unknown> } } | null = null
let resendTried = false

async function getEmailClient() {
  if (resendTried) return resendClient
  resendTried = true
  if (!process.env.RESEND_API_KEY) return null
  try {
    const segments = ['resend']
    const mod = (await import(/* webpackIgnore: true */ segments.join('/'))) as {
      Resend: new (key: string) => { emails: { send: (input: unknown) => Promise<unknown> } }
    }
    resendClient = new mod.Resend(process.env.RESEND_API_KEY)
  } catch {
    resendClient = null
  }
  return resendClient
}

export async function notify(input: NotifyInput): Promise<{ id: string; emailed: boolean }> {
  const row = await createNotification({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    metadata: input.metadata ?? null,
  })

  let emailed = false
  if (input.email) {
    emailed = await sendEmail(input).catch(() => false)
  }
  return { id: row.id, emailed }
}

async function sendEmail(input: NotifyInput): Promise<boolean> {
  const client = await getEmailClient()
  if (!client) return false
  const user = await findUserByIdCached(input.userId)
  if (!user?.email) return false
  await client.emails.send({
    from: process.env.EMAIL_FROM ?? 'Bachatly <alerts@bachatly.app>',
    to: user.email,
    subject: input.title,
    text: `${input.message}\n\n${process.env.NEXT_PUBLIC_APP_URL ?? ''}${input.link ?? ''}`,
  })
  return true
}

const userCache = new Map<string, { email: string | null } | null>()
async function findUserByIdCached(id: string) {
  if (userCache.has(id)) return userCache.get(id) ?? null
  const { findUserById } = await import('@/lib/db/repositories/user-repository')
  const user = await findUserById(id)
  const value = user ? { email: user.email } : null
  userCache.set(id, value)
  return value
}

export async function getNotifications(userId: string, options: { unread?: boolean; page?: number; pageSize?: number } = {}) {
  const pageSize = options.pageSize ?? 25
  const page = options.page ?? 1
  const result = await listNotifications(userId, {
    unreadOnly: options.unread,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })
  return {
    items: result.items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: new Date(n.createdAt).toISOString(),
    })),
    total: result.total,
    unreadCount: result.unreadCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
  }
}

export async function markRead(userId: string, id: string): Promise<boolean> {
  return markNotificationRead(id, userId)
}

export async function markAllRead(userId: string): Promise<number> {
  return markAllNotificationsRead(userId)
}

/** Convenience builder for the price-drop notification copy. */
export function priceDropNotification(params: {
  productTitle: string
  variantTitle: string
  currentPrice: number
  targetPrice: number
  retailerName: string | null
  variantSlug: string
}) {
  const current = formatPrice(params.currentPrice)
  const target = formatPrice(params.targetPrice)
  return {
    title: '🎉 Price Drop!',
    message: `${params.productTitle} ${params.variantTitle} is now available for ${current}${
      params.retailerName ? ` at ${params.retailerName}` : ''
    }. Your target was ${target}.`,
    link: `/products/${params.variantSlug}`,
  }
}
