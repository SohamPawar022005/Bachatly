import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { adminPriceJobSchema, adminPriceUpdateSchema } from '@/lib/validation/schemas'
import { adminRunPriceUpdate, adminUpdatePrice } from '@/services/admin-service'

/**
 * POST /api/admin/prices/update
 *
 * Two modes:
 *  - `mode=job`  -> run the price-update pipeline across listings
 *  - otherwise  -> record a new price for one specific listing
 */
export const POST = withApi(
  async (req: NextRequest) => {
    const body = await req.json().catch(() => ({}))
    const mode = (body as { mode?: string }).mode

    if (mode === 'job') {
      const options = adminPriceJobSchema.parse(body)
      const summary = await adminRunPriceUpdate({
        limit: options.limit,
        triggeredBy: options.triggeredBy ?? 'admin',
        simulateChange: options.simulateChange,
      })
      return ok(summary)
    }

    const input = adminPriceUpdateSchema.parse(body)
    return ok(await adminUpdatePrice(input))
  },
  { auth: 'admin', rateLimit: { max: 20, windowMs: 60_000 } },
)
