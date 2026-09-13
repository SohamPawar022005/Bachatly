import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { adminCreateRetailer, adminRetailers } from '@/services/admin-service'
import { adminRetailerCreateSchema } from '@/lib/validation/schemas'

/** GET /api/admin/retailers */
export const GET = withApi(async () => ok({ items: await adminRetailers() }), { auth: 'admin' })

/** POST /api/admin/retailers */
export const POST = withApi(async (_req: NextRequest, _ctx, input) => ok(await adminCreateRetailer(input), { status: 201 }), {
  schema: adminRetailerCreateSchema,
  auth: 'admin',
})
