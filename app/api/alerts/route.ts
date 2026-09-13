import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { alertCreateSchema } from '@/lib/validation/schemas'
import { createUserAlert, listUserAlerts } from '@/services/alert-service'
import { requireUser } from '@/lib/auth/guards'

/** GET /api/alerts — the user's price alerts with current prices and status. */
export const GET = withApi(
  async () => {
    const user = await requireUser()
    return ok({ items: await listUserAlerts(user.id) })
  },
  { auth: 'user' },
)

/** POST /api/alerts — "alert me when this drops below ₹X". */
export const POST = withApi(
  async (_req: NextRequest, _ctx, input) => {
    const user = await requireUser()
    const result = await createUserAlert(user.id, input)
    return ok(result, { status: 201 })
  },
  { schema: alertCreateSchema, auth: 'user' },
)
