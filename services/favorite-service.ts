import {
  addFavorite,
  listFavoriteVariantIds,
  listFavorites,
  removeFavorite,
  removeFavoriteByVariant,
} from '@/lib/db/repositories/favorite-repository'
import { findVariantById } from '@/lib/db/repositories/product-repository'
import { ERROR_CODES, notFound } from '@/lib/api/errors'
import { compareOffers } from '@/lib/pricing/compare'
import { listOffersForVariants } from '@/lib/db/repositories/product-repository'
import type { ComparisonResult } from '@/lib/pricing/types'

export interface FavoriteItem {
  id: string
  variantId: string
  variantSlug: string
  variantTitle: string
  title: string
  slug: string
  brand: string
  imageUrl: string | null
  rating: number
  addedAt: string
  comparison: ComparisonResult
}

export async function toggleFavorite(userId: string, productVariantId: string): Promise<{ added: boolean }> {
  const variant = await findVariantById(productVariantId)
  if (!variant) throw notFound('Product variant', ERROR_CODES.VARIANT_NOT_FOUND)
  const { created } = await addFavorite(userId, productVariantId)
  return { added: created }
}

export async function removeFavoriteForUser(userId: string, params: { id?: string; productVariantId?: string }): Promise<boolean> {
  if (params.id) return removeFavorite(params.id, userId)
  if (params.productVariantId) return removeFavoriteByVariant(userId, params.productVariantId)
  return false
}

export async function listUserFavorites(userId: string): Promise<FavoriteItem[]> {
  const rows = await listFavorites(userId)
  const offers = await listOffersForVariants(rows.map((r) => r.productVariantId))
  const byVariant = new Map<string, typeof offers>()
  for (const offer of offers) {
    const list = byVariant.get(offer.productVariantId)
    if (list) list.push(offer)
    else byVariant.set(offer.productVariantId, [offer])
  }
  return rows.map((row) => ({
    id: row.id,
    variantId: row.productVariantId,
    variantSlug: row.variantSlug,
    variantTitle: row.variantTitle,
    title: row.productTitle,
    slug: row.productSlug,
    brand: row.brand,
    imageUrl: row.imageUrl,
    rating: row.rating,
    addedAt: new Date(row.createdAt).toISOString(),
    comparison: compareOffers(byVariant.get(row.productVariantId) ?? []),
  }))
}

export async function favoriteVariantIds(userId: string): Promise<string[]> {
  return listFavoriteVariantIds(userId)
}
