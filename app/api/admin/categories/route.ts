import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { adminCreateCategory, adminListCategories } from '@/services/admin-service'
import { adminCategoryCreateSchema } from '@/lib/validation/schemas'

/** GET /api/admin/categories */
export const GET = withApi(async () => ok({ items: await adminListCategories() }), { auth: 'admin' })

/** POST /api/admin/categories */
export const POST = withApi(async (_req: NextRequest, _ctx, input) => ok(await adminCreateCategory(input), { status: 201 }), {
  schema: adminCategoryCreateSchema,
  auth: 'admin',
})
