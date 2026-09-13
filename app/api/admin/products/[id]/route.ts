import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { adminDeleteProduct, adminUpdateProduct } from '@/services/admin-service'
import { adminProductUpdateSchema } from '@/lib/validation/schemas'

/** PATCH /api/admin/products/:id */
export const PATCH = withApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }, input) => {
    const { id } = await ctx.params
    return ok(await adminUpdateProduct(id, input))
  },
  { schema: adminProductUpdateSchema, auth: 'admin' },
)

/** DELETE /api/admin/products/:id */
export const DELETE = withApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params
    return ok(await adminDeleteProduct(id))
  },
  { auth: 'admin' },
)
