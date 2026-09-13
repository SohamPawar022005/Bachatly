import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { deleteUserAlert } from '@/services/alert-service'
import { requireUser } from '@/lib/auth/guards'

/** DELETE /api/alerts/:id */
export const DELETE = withApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser()
    const { id } = await ctx.params
    const removed = await deleteUserAlert(user.id, id)
    return ok({ removed })
  },
  { auth: 'user' },
)
