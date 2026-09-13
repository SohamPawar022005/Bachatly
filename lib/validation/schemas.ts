import { z } from 'zod'

import { parsePriceInput } from '@/lib/utils/money'
import { slugify } from '@/lib/utils/slug'

/**
 * Input validation. Every API route parses its input through one of these
 * schemas before touching the database.
 *
 * Money arrives from clients in RUPEES (what a human types) and is converted to
 * integer paise for storage.
 */

// --------------------------------------------------------------------- auth

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginSchema>

// ------------------------------------------------------------------- search

export const SORT_OPTIONS = ['relevance', 'cheapest', 'price_desc', 'discount', 'rating', 'delivery', 'newest'] as const

const paise = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = parsePriceInput(String(value))
  return parsed === null ? undefined : parsed
}

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  category: z.string().trim().max(80).optional(),
  brand: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : v.split(',')))
    .transform((v) => (v ? v.map((s) => s.trim()).filter(Boolean) : undefined)),
  retailer: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : v.split(',')))
    .transform((v) => (v ? v.map((s) => s.trim()).filter(Boolean) : undefined)),
  minPrice: z
    .union([z.string(), z.number()])
    .optional()
    .transform(paise),
  maxPrice: z
    .union([z.string(), z.number()])
    .optional()
    .transform(paise),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minDiscount: z.coerce.number().min(0).max(95).optional(),
  freeDelivery: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  inStockOnly: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  sort: z.enum(SORT_OPTIONS).optional().default('relevance'),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(48).optional().default(12),
})
export type SearchQuery = z.infer<typeof searchQuerySchema>

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(12),
})

// ---------------------------------------------------------------- user data

export const favoriteCreateSchema = z.object({
  productVariantId: z.string().trim().min(1, 'productVariantId is required'),
})
export type FavoriteCreateInput = z.infer<typeof favoriteCreateSchema>

export const favoriteDeleteSchema = z.object({
  productVariantId: z.string().trim().min(1).optional(),
})

export const alertCreateSchema = z
  .object({
    productVariantId: z.string().trim().min(1, 'productVariantId is required'),
    /** Rupees, as typed by the user. */
    targetPrice: z.union([z.string(), z.number()]),
  })
  .transform((value, ctx) => {
    const parsed = parsePriceInput(value.targetPrice)
    if (parsed === null || parsed <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid target price', path: ['targetPrice'] })
      return z.NEVER
    }
    return { productVariantId: value.productVariantId, targetPrice: parsed }
  })
export type AlertCreateInput = { productVariantId: string; targetPrice: number }

export const idParamSchema = z.object({ id: z.string().trim().min(1) })

// -------------------------------------------------------------------- admin

export const variantInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(160).optional(),
  sku: z.string().trim().max(80).optional(),
  modelNumber: z.string().trim().max(80).optional(),
  gtin: z.string().trim().max(32).optional(),
  color: z.string().trim().max(60).optional(),
  size: z.string().trim().max(40).optional(),
  storage: z.string().trim().max(40).optional(),
  imageUrl: z.string().trim().max(600).optional(),
  specifications: z.record(z.string(), z.string()).optional(),
})

export const adminProductCreateSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(200),
  slug: z.string().trim().max(200).optional(),
  brand: z.string().trim().min(1, 'Brand is required').max(80),
  description: z.string().trim().max(4000).optional(),
  categoryId: z.string().trim().min(1, 'Category is required'),
  imageUrl: z.string().trim().max(600).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: z.coerce.number().int().min(0).optional(),
  variants: z.array(variantInputSchema).min(1, 'At least one variant is required').max(50),
})
export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>

export const adminProductUpdateSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  slug: z.string().trim().max(200).optional(),
  brand: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  categoryId: z.string().trim().min(1).optional(),
  imageUrl: z.string().trim().max(600).nullable().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: z.coerce.number().int().min(0).optional(),
})
export type AdminProductUpdateInput = z.infer<typeof adminProductUpdateSchema>

export const adminVariantCreateSchema = variantInputSchema.extend({
  productId: z.string().trim().min(1),
})

export const adminCategoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().max(600).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  parentId: z.string().trim().optional(),
})

export const adminRetailerCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(80).optional(),
  websiteUrl: z.string().trim().url('Enter a valid URL').max(300),
  logoUrl: z.string().trim().max(600).nullable().optional(),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #2874F0')
    .optional(),
  isActive: z.boolean().optional(),
  affiliateNetwork: z.string().trim().max(120).nullable().optional(),
  affiliateId: z.string().trim().max(120).nullable().optional(),
  affiliateUrlTemplate: z.string().trim().max(600).nullable().optional(),
})
export type AdminRetailerCreateInput = z.infer<typeof adminRetailerCreateSchema>

export const adminRetailerUpdateSchema = adminRetailerCreateSchema.partial()
export type AdminRetailerUpdateInput = z.infer<typeof adminRetailerUpdateSchema>

export const adminListingCreateSchema = z.object({
  productVariantId: z.string().trim().min(1),
  retailerId: z.string().trim().min(1),
  retailerProductId: z.string().trim().min(1).max(120),
  rawTitle: z.string().trim().min(1).max(300),
  productUrl: z.string().trim().url('Enter a valid URL').max(600),
  availability: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'PREORDER', 'UNKNOWN']).optional(),
  deliveryText: z.string().trim().max(160).nullable().optional(),
  /** Rupees. */
  deliveryFee: z.union([z.string(), z.number()]).optional(),
  deliveryDays: z.coerce.number().int().min(0).max(60).nullable().optional(),
  source: z.enum(['DEMO', 'LIVE_API', 'AFFILIATE_FEED', 'MANUAL']).optional(),
})
export type AdminListingCreateInput = z.infer<typeof adminListingCreateSchema>

export const adminPriceUpdateSchema = z
  .object({
    /** Identify the listing either by its id or by retailer + retailer product id. */
    listingId: z.string().trim().min(1).optional(),
    retailerId: z.string().trim().min(1).optional(),
    retailerProductId: z.string().trim().min(1).optional(),
    /** Rupees. */
    price: z.union([z.string(), z.number()]),
    /** Rupees. */
    mrp: z.union([z.string(), z.number()]).optional(),
    /** Rupees. Omit when the retailer does not publish a delivery fee. */
    deliveryFee: z.union([z.string(), z.number()]).nullable().optional(),
    availability: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'PREORDER', 'UNKNOWN']).optional(),
    deliveryText: z.string().trim().max(160).nullable().optional(),
  })
  .refine((v) => Boolean(v.listingId) || Boolean(v.retailerId && v.retailerProductId), {
    message: 'Provide either listingId, or both retailerId and retailerProductId',
  })
export type AdminPriceUpdateInput = z.infer<typeof adminPriceUpdateSchema>

export const adminUserUpdateSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).optional(),
  name: z.string().trim().min(2).max(80).optional(),
})

export const adminPriceJobSchema = z.object({
  /** Limit how many listings the simulated refresh touches. */
  limit: z.coerce.number().int().min(1).max(5000).optional(),
  triggeredBy: z.string().trim().max(80).optional(),
  /** Apply a deliberate percentage change to simulate market movement. */
  simulateChange: z
    .enum(['none', 'random', 'drop', 'rise'])
    .optional()
    .default('random'),
})
export type AdminPriceJobInput = z.infer<typeof adminPriceJobSchema>

export const notificationQuerySchema = z.object({
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(25),
})

/** Helper: build a URL-safe slug, falling back to a suffix when empty. */
export function toSlug(input: string, fallback = 'item'): string {
  const slug = slugify(input)
  return slug || fallback
}
