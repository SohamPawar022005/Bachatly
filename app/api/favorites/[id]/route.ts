import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok, fail } from '@/lib/api/respond'
import { removeFavoriteForUser } from '@/services/favorite-service'
import { ERROR_CODES } from '@/lib/api/errors'
import { requireUser } from '@/lib/auth/guards'

/**
 * DELETE /api/favorites/:id
 * `:id` may be the favourite row id or the product variant id.
 */
export const DELETE = withApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser()
    const { id } = await ctx.params
    const removed = await removeFavoriteForUser(user.id, {
      id,
      productVariantId: req.nextUrl.searchParams.get('variantId') ?? id,
    })
    if (!removed) return fail(ERROR_CODES.FAVORITE_NOT_FOUND, 'Favourite not found.', 404)
    return ok({ removed: true })
  },
  { auth: 'user' },
)
