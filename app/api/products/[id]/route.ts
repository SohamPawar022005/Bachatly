import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { getProductDetail } from '@/services/product-service'
import { ERROR_CODES, notFound } from '@/lib/api/errors'
import { findProductBySlug, listVariantsForProduct } from '@/lib/db/repositories/product-repository'

/**
 * GET /api/products/:idOrSlug — full product detail with live comparison.
 * Accepts a variant slug, a product slug or a product id.
 */
export const GET = withApi(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> } & { user: { id: string } | null }) => {
  const { id } = await ctx.params
  try {
    const detail = await getProductDetail(id, { userId: ctx.user?.id })
    return ok(detail)
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === ERROR_CODES.PRODUCT_NOT_FOUND) {
      const product = await findProductBySlug(id)
      if (product) {
        const variants = await listVariantsForProduct(product.id)
        return ok({ product, variants, note: 'Product-level lookup: no variant matched, returning product summary.' })
      }
      throw notFound('Product', ERROR_CODES.PRODUCT_NOT_FOUND)
    }
    throw error
  }
})
