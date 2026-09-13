import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok, fail } from '@/lib/api/respond'
import { markRead } from '@/services/notification-service'
import { ERROR_CODES } from '@/lib/api/errors'
import { requireUser } from '@/lib/auth/guards'

/** PATCH /api/notifications/:id/read */
export const PATCH = withApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser()
    const { id } = await ctx.params
    const updated = await markRead(user.id, id)
    if (!updated) return fail(ERROR_CODES.NOTIFICATION_NOT_FOUND, 'Notification not found or already read.', 404)
    return ok({ read: true })
  },
  { auth: 'user' },
)
