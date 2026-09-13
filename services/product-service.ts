import {
  findProductBySlug,
  findVariantBySlug,
  listVariantsForProduct,
  searchProducts,
} from '@/lib/db/repositories/product-repository'
import { getPricingForVariant, type VariantPricing } from './pricing-service'
import { isFavorite } from '@/lib/db/repositories/favorite-repository'
import { listAlerts } from '@/lib/db/repositories/alert-repository'
import { ERROR_CODES, notFound } from '@/lib/api/errors'

/**
 * Product service — assembles everything the product page needs.
 *
 * URLs are variant-level (`/products/apple-iphone-16-128gb-black`) because prices
 * differ per variant. A product-level slug is also accepted and resolves to the
 * cheapest variant.
 */

export interface VariantOption {
  id: string
  slug: string
  title: string
  lowestPrice: number | null
  listingCount: number
  storage: string | null
  color: string | null
  size: string | null
  bestDiscountPercent: number
}

export interface RelatedProduct {
  variantId: string
  variantSlug: string
  title: string
  brand: string
  imageUrl: string | null
  lowestPrice: number | null
  rating: number
}

export interface ProductDetailView {
  productId: string
  productSlug: string
  title: string
  fullTitle: string
  brand: string
  description: string | null
  imageUrl: string | null
  rating: number
  reviewCount: number
  categorySlug: string | null
  categoryName: string | null
  variantId: string
  variantSlug: string
  variantTitle: string
  sku: string | null
  modelNumber: string | null
  gtin: string | null
  specifications: Record<string, unknown> | null
  variants: VariantOption[]
  pricing: VariantPricing
  isFavorite: boolean
  activeAlert: { id: string; targetPrice: number; isActive: boolean } | null
  related: RelatedProduct[]
}

export async function getProductDetail(
  slug: string,
  options: { userId?: string } = {},
): Promise<ProductDetailView> {
  let variant = await findVariantBySlug(slug)

  if (!variant) {
    // Maybe the caller used a product slug — resolve to the cheapest variant.
    const product = await findProductBySlug(slug)
    if (!product) throw notFound('Product', ERROR_CODES.PRODUCT_NOT_FOUND)
    const variants = await listVariantsForProduct(product.id)
    const cheapest = variants.find((v) => v.lowestPrice !== null) ?? variants[0]
    if (!cheapest) throw notFound('Product variant', ERROR_CODES.VARIANT_NOT_FOUND)
    variant = await findVariantBySlug(cheapest.slug)
  }

  if (!variant) throw notFound('Product', ERROR_CODES.PRODUCT_NOT_FOUND)

  const [siblings, pricing] = await Promise.all([listVariantsForProduct(variant.productId), getPricingForVariant(variant.id)])

  const relatedRows = await searchProducts(
    { query: variant.productBrand, categorySlug: variant.categorySlug ?? undefined, pageSize: 8, sort: 'relevance' },
    { tsQuery: '' },
  )

  let favorite = false
  let activeAlert: ProductDetailView['activeAlert'] = null
  if (options.userId) {
    const [fav, alerts] = await Promise.all([isFavorite(options.userId, variant.id), listAlerts(options.userId, true)])
    favorite = fav
    const alert = alerts.find((a) => a.productVariantId === variant.id)
    activeAlert = alert ? { id: alert.id, targetPrice: alert.targetPrice, isActive: alert.isActive } : null
  }

  return {
    productId: variant.productId,
    productSlug: variant.productSlug,
    title: variant.productTitle,
    fullTitle: `${variant.productBrand} ${variant.productTitle} ${variant.title}`.trim(),
    brand: variant.productBrand,
    description: variant.productDescription,
    imageUrl: variant.imageUrl ?? variant.productImageUrl,
    rating: variant.rating,
    reviewCount: variant.reviewCount,
    categorySlug: variant.categorySlug,
    categoryName: variant.categoryName,
    variantId: variant.id,
    variantSlug: variant.slug,
    variantTitle: variant.title,
    sku: variant.sku,
    modelNumber: variant.modelNumber,
    gtin: variant.gtin,
    specifications: variant.specifications,
    variants: siblings.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      lowestPrice: s.lowestPrice,
      listingCount: s.listingCount,
      storage: s.storage,
      color: s.color,
      size: s.size,
      bestDiscountPercent: s.bestDiscountPercent,
    })),
    pricing,
    isFavorite: favorite,
    activeAlert,
    related: relatedRows.items
      .filter((row) => row.variant.id !== variant.id)
      .slice(0, 6)
      .map((row) => ({
        variantId: row.variant.id,
        variantSlug: row.variant.slug,
        title: row.productTitle,
        brand: row.productBrand,
        imageUrl: row.variant.imageUrl ?? row.productImageUrl,
        lowestPrice: row.variant.lowestPrice,
        rating: row.rating,
      })),
  }
}
