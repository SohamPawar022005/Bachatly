import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { adminUpdateUser } from '@/services/admin-service'
import { adminUserUpdateSchema } from '@/lib/validation/schemas'

/** PATCH /api/admin/users/:id */
export const PATCH = withApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }, input) => {
    const { id } = await ctx.params
    return ok(await adminUpdateUser(id, input))
  },
  { schema: adminUserUpdateSchema, auth: 'admin' },
)
