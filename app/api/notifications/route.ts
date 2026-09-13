import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { notificationQuerySchema } from '@/lib/validation/schemas'
import { getNotifications, markAllRead } from '@/services/notification-service'
import { requireUser } from '@/lib/auth/guards'

/** GET /api/notifications */
export const GET = withApi(
  async (req: NextRequest) => {
    const user = await requireUser()
    const parsed = notificationQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()))
    return ok(await getNotifications(user.id, parsed))
  },
  { auth: 'user' },
)

/** PATCH /api/notifications — mark everything read. */
export const PATCH = withApi(
  async () => {
    const user = await requireUser()
    const updated = await markAllRead(user.id)
    return ok({ updated })
  },
  { auth: 'user' },
)
