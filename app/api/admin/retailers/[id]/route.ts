import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { adminUpdateRetailer } from '@/services/admin-service'
import { adminRetailerUpdateSchema } from '@/lib/validation/schemas'

/** PATCH /api/admin/retailers/:id — includes activating / deactivating. */
export const PATCH = withApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }, input) => {
    const { id } = await ctx.params
    return ok(await adminUpdateRetailer(id, input))
  },
  { schema: adminRetailerUpdateSchema, auth: 'admin' },
)
