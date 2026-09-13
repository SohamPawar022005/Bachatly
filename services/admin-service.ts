import { db } from '@/lib/db/client'
import { cuid, slugify } from '@/lib/utils/id'
import { rupeesToPaise } from '@/lib/utils/money'
import { normalizeForMatching } from '@/lib/search/normalize'
import { appendPrice } from '@/lib/db/repositories/price-repository'
import { findListing, upsertListing } from '@/lib/db/repositories/listing-repository'
import {
  createProduct,
  deleteProduct,
  findProductById,
  listProductsForAdmin,
  refreshProductRollups,
  refreshVariantRollups,
  updateProduct,
} from '@/lib/db/repositories/product-repository'
import {
  createCategory,
  findCategoryById,
  listCategoriesWithCounts,
  updateCategory,
} from '@/lib/db/repositories/category-repository'
import {
  createRetailer as insertRetailer,
  findRetailerById,
  listRetailers,
  updateRetailer,
} from '@/lib/db/repositories/retailer-repository'
import { getDashboardStats, listJobRuns } from '@/lib/db/repositories/stats-repository'
import { listUsers, updateUser, type UserRole } from '@/lib/db/repositories/user-repository'
import { listListingsForAdmin, listListingsForVariant } from '@/lib/db/repositories/listing-repository'
import { listReviewQueue, reResolveListing } from '@/services/matching-service'
import { checkAlerts } from '@/services/alert-service'
import { runPriceUpdate, type PriceUpdateSummary } from '@/jobs/price-update'
import { ERROR_CODES, notFound } from '@/lib/api/errors'
import { adapterStatus } from '@/retailers'
import { optionalServiceStatus } from '@/lib/env'
import type {
  AdminListingCreateInput,
  AdminPriceUpdateInput,
  AdminProductCreateInput,
  AdminProductUpdateInput,
  AdminRetailerCreateInput,
} from '@/lib/validation/schemas'

/**
 * Admin service — product, retailer, listing and price management, plus the
 * dashboard statistics. Every write goes through the same pricing pipeline the
 * background jobs use, so the comparison stays consistent.
 */

export async function getAdminStats() {
  const [stats, runs] = await Promise.all([getDashboardStats(), listJobRuns(5)])
  return {
    ...stats,
    adapters: adapterStatus(),
    services: optionalServiceStatus(),
    recentRuns: runs,
  }
}

export async function getSystemHealth() {
  const started = Date.now()
  let database: 'ok' | 'error' = 'ok'
  let error: string | null = null
  try {
    await db.queryOne('SELECT 1 AS ok')
  } catch (e) {
    database = 'error'
    error = e instanceof Error ? e.message : 'database unreachable'
  }
  return {
    database,
    error,
    latencyMs: Date.now() - started,
    adapters: adapterStatus(),
    services: optionalServiceStatus(),
    queue: process.env.REDIS_URL ? 'redis' : 'in-process',
  }
}

async function uniqueSlug(base: string, table: 'products' | 'product_variants' | 'retailers' | 'categories', taken?: Set<string>): Promise<string> {
  let slug = slugify(base) || 'item'
  if (taken?.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  const exists = await db.queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM ${table} WHERE slug = $1`, [slug])
  if ((exists?.n ?? 0) > 0) slug = `${slug}-${Date.now().toString(36).slice(-4)}`
  return slug
}

export async function adminCreateProduct(input: AdminProductCreateInput) {
  const category = await findCategoryById(input.categoryId)
  if (!category) throw notFound('Category', ERROR_CODES.CATEGORY_NOT_FOUND)

  const productSlug = input.slug ? slugify(input.slug) : await uniqueSlug(`${input.brand}-${input.title}`, 'products')
  const product = await createProduct({
    title: input.title,
    slug: productSlug,
    brand: input.brand,
    description: input.description ?? null,
    categoryId: input.categoryId,
    imageUrl: input.imageUrl ?? null,
    rating: input.rating ?? 0,
    reviewCount: input.reviewCount ?? 0,
  })

  const variants = []
  for (const variant of input.variants) {
    const variantSlug = variant.slug
      ? slugify(variant.slug)
      : await uniqueSlug(`${productSlug}-${variant.title}`, 'product_variants')
    const id = cuid()
    await db.execute(
      `INSERT INTO product_variants
         (id, "productId", title, slug, sku, "modelNumber", gtin, color, size, storage, "imageUrl",
          specifications, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now(), now())`,
      [
        id,
        product.id,
        variant.title,
        variantSlug,
        variant.sku ?? null,
        variant.modelNumber ?? null,
        variant.gtin ?? null,
        variant.color ?? null,
        variant.size ?? null,
        variant.storage ?? null,
        variant.imageUrl ?? input.imageUrl ?? null,
        variant.specifications ? JSON.stringify(variant.specifications) : null,
      ],
    )
    variants.push({ id, slug: variantSlug, title: variant.title })
  }

  await refreshProductRollups(product.id)
  return { product, variants }
}

export async function adminUpdateProduct(id: string, input: AdminProductUpdateInput) {
  const existing = await findProductById(id)
  if (!existing) throw notFound('Product', ERROR_CODES.PRODUCT_NOT_FOUND)
  if (input.categoryId) {
    const category = await findCategoryById(input.categoryId)
    if (!category) throw notFound('Category', ERROR_CODES.CATEGORY_NOT_FOUND)
  }
  const patch = { ...input }
  if (patch.slug) patch.slug = slugify(patch.slug)
  return updateProduct(id, patch)
}

export async function adminDeleteProduct(id: string) {
  const existing = await findProductById(id)
  if (!existing) throw notFound('Product', ERROR_CODES.PRODUCT_NOT_FOUND)
  await deleteProduct(id)
  return { deleted: true, id }
}

export async function adminListProducts(query: { q?: string; page?: number; pageSize?: number }) {
  return listProductsForAdmin({ query: query.q, page: query.page, pageSize: query.pageSize })
}

export async function adminCreateRetailer(input: AdminRetailerCreateInput) {
  const slug = input.slug ? slugify(input.slug) : slugify(input.name)
  return insertRetailer({
    id: cuid(),
    name: input.name,
    slug,
    websiteUrl: input.websiteUrl,
    logoUrl: input.logoUrl ?? null,
    brandColor: input.brandColor ?? '#111827',
    isActive: input.isActive ?? true,
    affiliateNetwork: input.affiliateNetwork ?? null,
    affiliateId: input.affiliateId ?? null,
    affiliateUrlTemplate: input.affiliateUrlTemplate ?? null,
  })
}

export async function adminUpdateRetailer(id: string, input: Partial<AdminRetailerCreateInput>) {
  const existing = await findRetailerById(id)
  if (!existing) throw notFound('Retailer', ERROR_CODES.RETAILER_NOT_FOUND)
  const patch = { ...input }
  if (patch.slug) patch.slug = slugify(patch.slug)
  return updateRetailer(id, patch)
}

export async function adminCreateListing(input: AdminListingCreateInput) {
  const retailer = await findRetailerById(input.retailerId)
  if (!retailer) throw notFound('Retailer', ERROR_CODES.RETAILER_NOT_FOUND)
  const variant = await db.queryOne<{ id: string }>(`SELECT id FROM product_variants WHERE id = $1`, [input.productVariantId])
  if (!variant) throw notFound('Product variant', ERROR_CODES.VARIANT_NOT_FOUND)

  const deliveryFeePaise =
    input.deliveryFee === undefined || input.deliveryFee === null ? 0 : rupeesToPaise(Number(input.deliveryFee))

  const listing = await upsertListing({
    productVariantId: input.productVariantId,
    retailerId: input.retailerId,
    retailerProductId: input.retailerProductId,
    rawTitle: input.rawTitle,
    normalizedTitle: normalizeForMatching(input.rawTitle),
    productUrl: input.productUrl,
    affiliateUrl: retailer.affiliateUrlTemplate
      ? retailer.affiliateUrlTemplate.replace('{productUrl}', input.productUrl).replace('{affiliateId}', retailer.affiliateId ?? '')
      : null,
    availability: input.availability ?? 'UNKNOWN',
    deliveryText: input.deliveryText ?? null,
    deliveryFee: deliveryFeePaise,
    deliveryDays: input.deliveryDays ?? null,
    source: input.source ?? 'MANUAL',
    resolutionStatus: 'RESOLVED',
    matchConfidence: 100,
  })
  return listing
}

/**
 * Admin price update. Appends a new price record (history is never rewritten),
 * refreshes the comparison rollups and immediately evaluates price alerts — so
 * an admin changing a price is enough to trigger a user notification.
 */
export async function adminUpdatePrice(input: AdminPriceUpdateInput) {
  let listingId = input.listingId
  if (!listingId && input.retailerId && input.retailerProductId) {
    const listing = await findListing(input.retailerId, input.retailerProductId)
    if (!listing) throw notFound('Listing', ERROR_CODES.NOT_FOUND)
    listingId = listing.id
  }
  if (!listingId) throw notFound('Listing', ERROR_CODES.NOT_FOUND)

  const [listing] = await db.query<{ id: string; productVariantId: string }>(
    `SELECT id, "productVariantId" FROM product_listings WHERE id = $1`,
    [listingId],
  )

  if (!listing) throw notFound('Listing', ERROR_CODES.NOT_FOUND)

  const pricePaise = rupeesToPaise(Number(input.price))
  const mrpPaise = input.mrp === undefined || input.mrp === null ? pricePaise : rupeesToPaise(Number(input.mrp))
  const hasDeliveryFee = input.deliveryFee !== undefined && input.deliveryFee !== null
  const deliveryFeePaise = hasDeliveryFee ? rupeesToPaise(Number(input.deliveryFee as string | number)) : 0

  const price = await appendPrice({
    listingId,
    price: pricePaise,
    mrp: mrpPaise,
    deliveryFee: hasDeliveryFee ? deliveryFeePaise : null,
    deliveryFeeKnown: hasDeliveryFee,
    inStock: input.availability ? input.availability !== 'OUT_OF_STOCK' : true,
  })

  await db.execute(
    `UPDATE product_listings SET
        availability = COALESCE($2, availability),
        "deliveryText" = COALESCE($3, "deliveryText"),
        "lastCheckedAt" = now(), "updatedAt" = now()
     WHERE id = $1`,
    [listingId, input.availability ?? null, input.deliveryText ?? null],
  )

  await refreshVariantRollups(listing.productVariantId)
  const product = await db.queryOne<{ productId: string }>(
    `SELECT "productId" FROM product_variants WHERE id = $1`,
    [listing.productVariantId],
  )
  if (product) await refreshProductRollups(product.productId)

  const alerts = await checkAlerts()

  return { price, alertsTriggered: alerts.triggered, notificationsSent: alerts.notified }
}

export async function adminRunPriceUpdate(options: { limit?: number; triggeredBy?: string; simulateChange?: 'none' | 'random' | 'drop' | 'rise' }): Promise<PriceUpdateSummary> {
  return runPriceUpdate(options)
}

export async function adminListCategories() {
  return listCategoriesWithCounts()
}

export async function adminCreateCategory(input: { name: string; slug?: string; description?: string; imageUrl?: string; sortOrder?: number; parentId?: string }) {
  const slug = input.slug ? slugify(input.slug) : slugify(input.name)
  return createCategory({ ...input, slug })
}

export async function adminUpdateCategory(id: string, input: { name?: string; description?: string; imageUrl?: string; sortOrder?: number }) {
  const existing = await findCategoryById(id)
  if (!existing) throw notFound('Category', ERROR_CODES.CATEGORY_NOT_FOUND)
  return updateCategory(id, input)
}

export async function adminListUsers(query: { q?: string; page?: number; pageSize?: number }) {
  const pageSize = query.pageSize ?? 25
  const page = query.page ?? 1
  return listUsers({ query: query.q, limit: pageSize, offset: (page - 1) * pageSize })
}

export async function adminUpdateUser(id: string, patch: { role?: UserRole; name?: string }) {
  const updated = await updateUser(id, patch)
  if (!updated) throw notFound('User', ERROR_CODES.NOT_FOUND)
  const { passwordHash: _ignored, ...safe } = updated
  void _ignored
  return safe
}

export async function adminListListings(query: { variantId?: string; retailerId?: string; resolutionStatus?: 'RESOLVED' | 'PENDING' | 'UNMATCHED' }) {
  return listListingsForAdmin(query)
}

export async function adminListReviewQueue(limit = 50) {
  return listReviewQueue(limit)
}

export async function adminReResolve(listingId: string) {
  return reResolveListing(listingId)
}

export async function adminRetailers() {
  return listRetailers()
}

export async function adminListingsForVariant(variantId: string) {
  return listListingsForVariant(variantId)
}
