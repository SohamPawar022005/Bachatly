import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { adminReResolve } from '@/services/admin-service'

/** POST /api/admin/matches/:id/resolve — re-run identity resolution for a listing. */
export const POST = withApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params
    return ok(await adminReResolve(id))
  },
  { auth: 'admin' },
)
