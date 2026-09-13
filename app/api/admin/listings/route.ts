import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { adminCreateListing, adminListListings } from '@/services/admin-service'
import { adminListingCreateSchema } from '@/lib/validation/schemas'

/** GET /api/admin/listings */
export const GET = withApi(
  async (req: NextRequest) => {
    const params = req.nextUrl.searchParams
    const items = await adminListListings({
      variantId: params.get('variantId') ?? undefined,
      retailerId: params.get('retailerId') ?? undefined,
      resolutionStatus: (params.get('resolutionStatus') as 'RESOLVED' | 'PENDING' | 'UNMATCHED' | null) ?? undefined,
    })
    return ok({ items })
  },
  { auth: 'admin' },
)

/** POST /api/admin/listings */
export const POST = withApi(async (_req: NextRequest, _ctx, input) => ok(await adminCreateListing(input), { status: 201 }), {
  schema: adminListingCreateSchema,
  auth: 'admin',
})
