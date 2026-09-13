import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { favoriteCreateSchema } from '@/lib/validation/schemas'
import { listUserFavorites, toggleFavorite } from '@/services/favorite-service'

/** GET /api/favorites — saved products with their current cheapest price. */
export const GET = withApi(
  async () => {
    const user = await requireCurrentUser()
    return ok({ items: await listUserFavorites(user.id) })
  },
  { auth: 'user' },
)

/** POST /api/favorites — add a product variant. Duplicates are a no-op. */
export const POST = withApi(
  async (_req: NextRequest, ctx, input) => {
    const user = await requireCurrentUser()
    const result = await toggleFavorite(user.id, input.productVariantId)
    return ok(result, { status: result.added ? 201 : 200 })
  },
  { schema: favoriteCreateSchema, auth: 'user' },
)

async function requireCurrentUser() {
  const { requireUser } = await import('@/lib/auth/guards')
  return requireUser()
}
