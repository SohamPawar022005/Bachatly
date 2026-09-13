import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { adminCreateProduct, adminListProducts } from '@/services/admin-service'
import { adminProductCreateSchema } from '@/lib/validation/schemas'

/** GET /api/admin/products */
export const GET = withApi(
  async (req: NextRequest) => {
    const params = req.nextUrl.searchParams
    const result = await adminListProducts({
      q: params.get('q') ?? undefined,
      page: params.get('page') ? Number(params.get('page')) : undefined,
      pageSize: params.get('pageSize') ? Number(params.get('pageSize')) : undefined,
    })
    return ok(result)
  },
  { auth: 'admin' },
)

/** POST /api/admin/products */
export const POST = withApi(async (_req: NextRequest, _ctx, input) => ok(await adminCreateProduct(input), { status: 201 }), {
  schema: adminProductCreateSchema,
  auth: 'admin',
})
