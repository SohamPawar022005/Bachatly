/**
 * Bachatly seed script.
 *
 * Everything is written through the same repositories and services the running
 * application uses, so the demo data flows through real business logic:
 *
 *   catalogue  ->  products / variants
 *   listings   ->  identity resolution (lib/matching)  ->  product_listings
 *   prices     ->  pricing service (effective price)   ->  append-only history
 *   rollups    ->  cheapest price / savings denormalisation
 *
 * Re-running it resets the database to a known state.
 *
 *   pnpm db:seed
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'

import { closePool } from '@/lib/db/pool'
import { db } from '@/lib/db/client'
import {
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  AMBIGUOUS_LISTINGS,
  rs,
  type SeedAvailability,
  type SeedVariantInput,
  type Trend,
} from './seed-data/catalogue'
import { SEED_RETAILERS, renderRetailerTitle, type SeedRetailer } from './seed-data/retailers'
import { createRetailer, findRetailerBySlug, updateRetailer } from '@/lib/db/repositories/retailer-repository'
import { createCategory, findCategoryBySlug } from '@/lib/db/repositories/category-repository'
import {
  createProduct,
  refreshProductRollups,
  refreshVariantRollups,
} from '@/lib/db/repositories/product-repository'
import { upsertListing, updateListingAvailability } from '@/lib/db/repositories/listing-repository'
import { appendPrice } from '@/lib/db/repositories/price-repository'
import { createUser, findUserByEmail, updateUser } from '@/lib/db/repositories/user-repository'
import { addFavorite } from '@/lib/db/repositories/favorite-repository'
import { createAlert, markAlertTriggered } from '@/lib/db/repositories/alert-repository'
import { createNotification } from '@/lib/db/repositories/notification-repository'
import { recordIdentityMatch } from '@/lib/db/repositories/stats-repository'
import { recordSearch } from '@/lib/db/repositories/search-history-repository'
import { scoreMatch } from '@/lib/matching/score'
import { normalizeForMatching } from '@/lib/search/normalize'
import { calculateEffectivePrice } from '@/lib/pricing/effective-price'
import { cuid, slugify } from '@/lib/utils/id'
import { DAY } from '@/lib/utils/time'

// ---------------------------------------------------------------------------
// Deterministic pseudo random numbers so the demo dataset is reproducible.
// ---------------------------------------------------------------------------
function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Price history synthesis
// ---------------------------------------------------------------------------
const HISTORY_DAYS = 90

/**
 * Builds a believable daily price series that ends exactly on the price the
 * catalogue declares as "current". Nothing here is presented as real data —
 * it is the demonstration history the charts read.
 */
function buildPriceHistory(params: {
  key: string
  trend: Trend
  currentPrice: number
  mrp: number
  days?: number
}): number[] {
  const { key, trend, currentPrice, mrp } = params
  const days = params.days ?? HISTORY_DAYS
  const rng = mulberry32(hashString(key))
  const out: number[] = []
  const cap = mrp > 0 ? mrp : currentPrice * 1.2
  const floor = currentPrice * 0.72

  for (let i = 0; i < days; i++) {
    const progress = i / (days - 1)
    const noise = (rng() - 0.5) * 0.012
    let value: number

    switch (trend) {
      case 'dropping':
        value = currentPrice * (1.14 - 0.14 * progress) * (1 + noise)
        break
      case 'rising':
        value = currentPrice * (0.9 + 0.1 * progress) * (1 + noise)
        break
      case 'volatile':
        value = currentPrice * (1 + Math.sin(progress * Math.PI * 6) * 0.06 + noise)
        break
      case 'recent-drop': {
        // Flat for most of the window, then a sharp drop in the last few days —
        // this is what powers the "biggest price drops" feed and alert triggers.
        const dropPoint = 0.94
        value = progress < dropPoint
          ? currentPrice * 1.16 * (1 + noise)
          : currentPrice * (1 + noise * 0.4)
        break
      }
      case 'recovered':
        value = currentPrice * (1 + Math.sin(progress * Math.PI) * 0.08 + noise)
        break
      default:
        value = currentPrice * (1 + noise)
    }

    out.push(Math.max(floor, Math.min(cap, Math.round(value / 100) * 100)))
  }

  // The final point is always exactly the declared current price.
  out[out.length - 1] = currentPrice
  return out
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

interface Counters {
  categories: number
  products: number
  variants: number
  listings: number
  prices: number
  matches: number
  pendingMatches: number
}

const counters: Counters = {
  categories: 0,
  products: 0,
  variants: 0,
  listings: 0,
  prices: 0,
  matches: 0,
  pendingMatches: 0,
}

async function resetDatabase() {
  // Order matters because of foreign keys.
  const tables = [
    'identity_matches',
    'price_update_runs',
    'notifications',
    'search_history',
    'price_alerts',
    'favorites',
    'prices',
    'product_listings',
    'product_variants',
    'products',
    'retailers',
  ]
  for (const table of tables) {
    await db.execute(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`)
  }
  await db.execute(`TRUNCATE TABLE "categories" RESTART IDENTITY CASCADE`)
  await db.execute(`DELETE FROM users WHERE email IN ('admin@bachatly.app', 'demo@bachatly.app', $1)`, [
    process.env.SEED_ADMIN_EMAIL ?? 'admin@bachatly.app',
  ])
}

async function seedRetailers(): Promise<Map<string, { id: string; retailer: SeedRetailer }>> {
  const map = new Map<string, { id: string; retailer: SeedRetailer }>()
  for (const seed of SEED_RETAILERS) {
    const existing = await findRetailerBySlug(seed.slug)
    const row = existing
      ? (await updateRetailer(existing.id, {
          name: seed.name,
          logoUrl: null,
          websiteUrl: seed.websiteUrl,
          brandColor: seed.brandColor,
          isActive: true,
          affiliateNetwork: seed.affiliateNetwork,
          affiliateId: seed.affiliateId,
          affiliateUrlTemplate: seed.affiliateUrlTemplate,
        }))!
      : await createRetailer({
          id: cuid(),
          name: seed.name,
          slug: seed.slug,
          websiteUrl: seed.websiteUrl,
          brandColor: seed.brandColor,
          isActive: true,
          affiliateNetwork: seed.affiliateNetwork,
          affiliateId: seed.affiliateId,
          affiliateUrlTemplate: seed.affiliateUrlTemplate,
        })
    map.set(seed.slug, { id: row.id, retailer: seed })
  }
  return map
}

async function seedCategories(): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>()
  // Parents first.
  for (const category of SEED_CATEGORIES.filter((c) => !c.parent)) {
    const existing = await findCategoryBySlug(category.slug)
    const row = existing ?? (await createCategory({ ...category, parentId: null }))
    bySlug.set(category.slug, row.id)
    counters.categories++
  }
  for (const category of SEED_CATEGORIES.filter((c) => c.parent)) {
    const parentId = bySlug.get(category.parent!) ?? null
    const existing = await findCategoryBySlug(category.slug)
    const row = existing ?? (await createCategory({ ...category, parentId }))
    bySlug.set(category.slug, row.id)
    counters.categories++
  }
  return bySlug
}

interface SeededVariant {
  id: string
  slug: string
  title: string
  productTitle: string
  productBrand: string
  storage: string | null
  color: string | null
  size: string | null
  modelNumber: string | null
  gtin: string | null
}

async function seedProducts(categoryIds: Map<string, string>): Promise<SeededVariant[]> {
  const seededVariants: SeededVariant[] = []

  for (const product of SEED_PRODUCTS) {
    const categoryId = categoryIds.get(product.category)
    if (!categoryId) {
      // Unknown category in the catalogue — fall back to the first available one
      // rather than failing the whole seed.
      throw new Error(`Seed data references unknown category "${product.category}" for product "${product.title}"`)
    }

    const created = await createProduct({
      title: product.title,
      slug: product.slug,
      brand: product.brand,
      description: product.description,
      categoryId,
      imageUrl: product.imageUrl,
      rating: product.rating,
      reviewCount: product.reviewCount,
    })
    counters.products++

    for (const variant of product.variants) {
      const id = await insertVariant({ product, variant, productId: created.id })
      counters.variants++
      seededVariants.push({
        id,
        slug: variant.slug,
        title: variant.title,
        productTitle: product.title,
        productBrand: product.brand,
        storage: variant.storage ?? null,
        color: variant.color ?? null,
        size: variant.size ?? null,
        modelNumber: variant.modelNumber ?? null,
        gtin: variant.gtin ?? null,
      })
    }
  }

  return seededVariants
}

async function insertVariant(params: {
  product: (typeof SEED_PRODUCTS)[number]
  variant: SeedVariantInput
  productId: string
}): Promise<string> {
  const { product, variant, productId } = params
  const id = cuid()
  await db.execute(
    `INSERT INTO product_variants
       (id, "productId", title, slug, sku, "modelNumber", gtin, color, size, storage, "imageUrl",
        specifications, "listingCount", "bestDiscountPercent", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,0, now(), now())`,
    [
      id,
      productId,
      variant.title,
      variant.slug,
      variant.sku ?? null,
      variant.modelNumber ?? null,
      variant.gtin ?? null,
      variant.color ?? null,
      variant.size ?? null,
      variant.storage ?? null,
      product.imageUrl,
      variant.specifications ? JSON.stringify(variant.specifications) : null,
    ],
  )
  return id
}

/**
 * Identity resolution for a single retailer listing.
 *
 * The listing is scored against every canonical variant; the best candidate is
 * accepted only when it clears the auto-merge threshold. Everything else is
 * queued for review (PENDING) or rejected (UNMATCHED) — and never takes part in
 * a price comparison.
 */
async function resolveListing(params: {
  rawTitle: string
  retailerId: string
  retailerProductId: string
  candidates: SeededVariant[]
}): Promise<{ variantId: string | null; status: 'RESOLVED' | 'PENDING' | 'UNMATCHED'; score: number }> {
  const { rawTitle, retailerId, retailerProductId, candidates } = params

  let best: { variant: SeededVariant; score: number; decision: string; breakdown: unknown } | null = null
  for (const candidate of candidates) {
    const result = scoreMatch(
      { title: rawTitle },
      {
        // The canonical side is composed from structured attributes, not from a
        // display label — that is what makes retailer wordings comparable.
        title: [candidate.productBrand, candidate.productTitle, candidate.storage, candidate.color, candidate.size]
          .filter((part): part is string => Boolean(part))
          .join(' '),
        brand: candidate.productBrand,
        storage: candidate.storage ?? undefined,
        color: candidate.color ?? undefined,
        size: candidate.size ?? undefined,
        modelNumber: candidate.modelNumber ?? undefined,
        gtin: candidate.gtin ?? undefined,
      },
    )
    if (!best || result.score > best.score) {
      best = { variant: candidate, score: result.score, decision: result.decision, breakdown: result.breakdown }
    }
  }

  const listingId = cuid()
  const status: 'RESOLVED' | 'PENDING' | 'UNMATCHED' = !best
    ? 'UNMATCHED'
    : best.decision === 'AUTO_MERGE'
      ? 'RESOLVED'
      : best.decision === 'REVIEW'
        ? 'PENDING'
        : 'UNMATCHED'
  void listingId

  await db.execute(
    `INSERT INTO identity_matches (id, "listingId", "productVariantId", "rawTitle", score, breakdown, status, "createdAt")
     VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6, now())`,
    [
      listingId,
      best && status !== 'UNMATCHED' ? best.variant.id : null,
      rawTitle,
      best?.score ?? 0,
      JSON.stringify(best?.breakdown ?? []),
      status === 'RESOLVED' ? 'ACCEPTED' : status === 'PENDING' ? 'PENDING' : 'REJECTED',
    ],
  )
  counters.matches++
  if (status === 'PENDING') counters.pendingMatches++

  return { variantId: status === 'RESOLVED' && best ? best.variant.id : null, status, score: best?.score ?? 0 }
}

async function seedListingsAndPrices(params: {
  variants: SeededVariant[]
  retailers: Map<string, { id: string; retailer: SeedRetailer }>
}) {
  const { variants, retailers } = params
  const bySlug = new Map(variants.map((v) => [v.slug, v]))
  const now = Date.now()

  for (const product of SEED_PRODUCTS) {
    for (const variant of product.variants) {
      const seeded = bySlug.get(variant.slug)
      if (!seeded) continue

      for (const listingInput of variant.listings) {
        const retailerEntry = retailers.get(listingInput.retailer)
        if (!retailerEntry) {
          throw new Error(`Seed data references unknown retailer "${listingInput.retailer}"`)
        }
        const retailerProductId = `${retailerEntry.retailer.slug}-${variant.slug}`
        const rawTitle =
          listingInput.rawTitle ??
          renderRetailerTitle(retailerEntry.retailer.titleStyle, {
            brand: product.brand,
            title: product.title,
            storage: variant.storage ?? null,
            color: variant.color ?? null,
            size: variant.size ?? null,
          })

        const resolution = await resolveListing({
          rawTitle,
          retailerId: retailerEntry.id,
          retailerProductId,
          candidates: [seeded],
        })

        const pricePaise = rs(listingInput.price)
        const mrpPaise = rs(listingInput.mrp)
        const hasDeliveryFee = listingInput.deliveryFee !== undefined
        const deliveryFeePaise = hasDeliveryFee ? rs(listingInput.deliveryFee as number) : 0
        const availability = (listingInput.availability ?? 'IN_STOCK') as SeedAvailability

        const created = await upsertListing({
          id: cuid(),
          productVariantId: resolution.variantId ?? seeded.id,
          retailerId: retailerEntry.id,
          retailerProductId,
          rawTitle,
          normalizedTitle: normalizeForMatching(rawTitle),
          productUrl: `${retailerEntry.retailer.websiteUrl}/p/${retailerProductId}`,
          affiliateUrl: retailerEntry.retailer.affiliateUrlTemplate
            ? retailerEntry.retailer.affiliateUrlTemplate
                .replace('{productUrl}', `${retailerEntry.retailer.websiteUrl}/p/${retailerProductId}`)
                .replace('{affiliateId}', retailerEntry.retailer.affiliateId ?? '')
            : null,
          availability,
          deliveryText: listingInput.deliveryText ?? null,
          deliveryFee: deliveryFeePaise,
          deliveryDays: listingInput.deliveryDays ?? null,
          source: 'DEMO',
          resolutionStatus: resolution.status,
          matchConfidence: resolution.score,
        })
        counters.listings++

        // ---- price history -------------------------------------------------
        const history = buildPriceHistory({
          key: `${retailerProductId}`,
          trend: listingInput.trend ?? 'stable',
          currentPrice: pricePaise,
          mrp: mrpPaise,
        })

        for (let i = 0; i < history.length; i++) {
          const daysAgo = history.length - 1 - i
          const checkedAt = new Date(now - daysAgo * DAY - ((i * 7) % 11) * 3600_000)
          const isLast = i === history.length - 1
          const effective = calculateEffectivePrice({
            price: history[i],
            mrp: mrpPaise,
            deliveryFee: hasDeliveryFee ? deliveryFeePaise : null,
            deliveryFeeKnown: hasDeliveryFee,
          })
          await appendPrice({
            listingId: created.id,
            price: history[i],
            mrp: mrpPaise,
            deliveryFee: hasDeliveryFee ? deliveryFeePaise : null,
            deliveryFeeKnown: hasDeliveryFee,
            inStock: isLast ? availability !== 'OUT_OF_STOCK' : true,
            checkedAt: isLast ? new Date(now - (hashString(retailerProductId) % 25) * 60_000) : checkedAt,
          })
          counters.prices++
        }

        await updateListingAvailability(created.id, {
          availability,
          deliveryText: listingInput.deliveryText ?? null,
          lastCheckedAt: new Date(now - (hashString(retailerProductId) % 25) * 60_000),
        })
      }

      await refreshVariantRollups(seeded.id)
    }
    await refreshProductRollups((await db.queryOne<{ id: string }>(`SELECT id FROM products WHERE slug = $1`, [product.slug]))!.id)
  }
}

async function seedAmbiguousListing(params: { retailers: Map<string, { id: string; retailer: SeedRetailer }> }) {
  const { retailers } = params
  for (const item of AMBIGUOUS_LISTINGS) {
    const retailerEntry = retailers.get(item.retailer)
    if (!retailerEntry) continue
    const target = await db.queryOne<{ id: string }>(`SELECT id FROM product_variants WHERE slug = $1`, [item.matchAgainst])
    if (!target) continue

    const score = scoreMatch(
      { title: item.rawTitle },
      { title: item.matchAgainst.replace(/-/g, ' '), storage: '128GB', color: 'Black' },
    )

    const created = await upsertListing({
      id: cuid(),
      productVariantId: target.id,
      retailerId: retailerEntry.id,
      retailerProductId: item.retailerProductId,
      rawTitle: item.rawTitle,
      normalizedTitle: normalizeForMatching(item.rawTitle),
      productUrl: `${retailerEntry.retailer.websiteUrl}/p/${item.retailerProductId}`,
      availability: 'IN_STOCK',
      deliveryText: 'Delivery in 5 days',
      deliveryFee: rs(40),
      deliveryDays: 5,
      source: 'DEMO',
      resolutionStatus: 'PENDING',
      matchConfidence: score.score,
    })
    counters.listings++
    counters.pendingMatches++

    await appendPrice({
      listingId: created.id,
      price: rs(item.price),
      mrp: rs(item.mrp),
      deliveryFee: rs(40),
      deliveryFeeKnown: true,
      inStock: true,
      checkedAt: new Date(),
    })
    counters.prices++
    await updateListingAvailability(created.id, { availability: 'IN_STOCK', lastCheckedAt: new Date() })

    await recordIdentityMatch({
      listingId: created.id,
      productVariantId: target.id,
      rawTitle: item.rawTitle,
      score: score.score,
      breakdown: score.breakdown,
      status: 'PENDING',
    })
  }
}

async function seedUsers() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@bachatly.app'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345'
  const userEmail = process.env.SEED_USER_EMAIL ?? 'demo@bachatly.app'
  const userPassword = process.env.SEED_USER_PASSWORD ?? 'Demo@12345'

  const [adminHash, userHash] = await Promise.all([
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash(userPassword, 10),
  ])

  const existingAdmin = await findUserByEmail(adminEmail)
  const admin = existingAdmin
    ? (await updateUser(existingAdmin.id, { name: 'Bachatly Admin', role: 'ADMIN' }))!
    : await createUser({ name: 'Bachatly Admin', email: adminEmail, passwordHash: adminHash, role: 'ADMIN' })

  const existingUser = await findUserByEmail(userEmail)
  const demoUser = existingUser
    ? (await updateUser(existingUser.id, { name: 'Demo Shopper', role: 'USER' }))!
    : await createUser({ name: 'Demo Shopper', email: userEmail, passwordHash: userHash, role: 'USER' })

  return { admin, demoUser }
}

async function seedUserActivity(demoUserId: string) {
  // Favourites ----------------------------------------------------------------
  const favoriteSlugs = ['apple-iphone-16-128gb-black', 'sony-wh-1000xm5-over-ear-black', 'apple-airpods-pro-2-usb-c-white']
  for (const slug of favoriteSlugs) {
    const variant = await db.queryOne<{ id: string }>(`SELECT id FROM product_variants WHERE slug = $1`, [slug])
    if (variant) await addFavorite(demoUserId, variant.id)
  }

  // Alerts --------------------------------------------------------------------
  // 1. A "waiting" alert: target below the current cheapest price.
  const iphone = await db.queryOne<{ id: string; price: number }>(
    `SELECT id, "lowestPrice" AS price FROM product_variants WHERE slug = $1`,
    ['apple-iphone-16-128gb-black'],
  )
  if (iphone && iphone.price) {
    const target = iphone.price - rs(2000)
    await db.execute(
      `INSERT INTO price_alerts (id, "userId", "productVariantId", "targetPrice", "isActive", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,true, now(), now())
       ON CONFLICT ("userId", "productVariantId") DO UPDATE SET "targetPrice" = EXCLUDED."targetPrice"`,
      [cuid(), demoUserId, iphone.id, target],
    )
  }

  // 2. An alert that has already fired (price is already at/below the target).
  const airpods = await db.queryOne<{ id: string; price: number }>(
    `SELECT id, "lowestPrice" AS price FROM product_variants WHERE slug = $1`,
    ['apple-airpods-pro-2-usb-c-white'],
  )
  if (airpods && airpods.price) {
    const row = await db.queryOne<{ id: string }>(
      `INSERT INTO price_alerts (id, "userId", "productVariantId", "targetPrice", "isActive", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,true, now(), now())
       ON CONFLICT ("userId", "productVariantId") DO UPDATE SET "targetPrice" = EXCLUDED."targetPrice"
       RETURNING id`,
      [cuid(), demoUserId, airpods.id, airpods.price + rs(1000)],
    )
    if (row) await markAlertTriggered(row.id, airpods.price)
    await createNotification({
      userId: demoUserId,
      type: 'ALERT_TRIGGERED',
      title: '🎉 Price Drop!',
      message: `Apple AirPods Pro (2nd generation) is now available for ₹${(airpods.price / 100).toLocaleString('en-IN')}. Your target was ₹${((airpods.price + rs(1000)) / 100).toLocaleString('en-IN')}.`,
      link: '/products/apple-airpods-pro-2-usb-c-white',
      metadata: { variantSlug: 'apple-airpods-pro-2-usb-c-white', targetPrice: airpods.price + rs(1000), currentPrice: airpods.price },
    })
  }

  await createNotification({
    userId: demoUserId,
    type: 'SYSTEM',
    title: 'Welcome to Bachatly',
    message: 'You are browsing demonstration data. Connect an authorized retailer feed to see live prices.',
    link: '/deals',
    metadata: { kind: 'welcome' },
  })

  // Search history ------------------------------------------------------------
  const searches: Array<[string, number]> = [
    ['iPhone 16', 3],
    ['airpods pro', 1],
    ['macbook air m2', 2],
    ['nike shoes', 3],
    ['samsung tv', 3],
    ['headphones', 6],
  ]
  for (const [query, count] of searches) {
    await recordSearch(demoUserId, query, count)
  }
}

async function seedSearchHistory() {
  // Anonymous popular searches give the homepage real aggregate data.
  const user = await db.queryOne<{ id: string }>(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [
    process.env.SEED_USER_EMAIL ?? 'demo@bachatly.app',
  ])
  if (!user) return
  const popular: Array<[string, number]> = [
    ['iphone', 14],
    ['macbook', 8],
    ['airpods', 11],
    ['nike shoes', 6],
    ['samsung tv', 5],
    ['headphones', 9],
    ['iphone 16', 12],
    ['power bank', 4],
  ]
  for (const [query, repeats] of popular) {
    for (let i = 0; i < repeats; i++) {
      await recordSearch(user.id, query, 3)
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const started = Date.now()
  console.log('Seeding Bachatly ...')

  await resetDatabase()
  const retailers = await seedRetailers()
  console.log(`  · ${retailers.size} retailers`)

  const categoryIds = await seedCategories()
  console.log(`  · ${counters.categories} categories`)

  const variants = await seedProducts(categoryIds)
  console.log(`  · ${counters.products} products, ${counters.variants} variants`)

  await seedListingsAndPrices({ variants, retailers })
  console.log(`  · ${counters.listings} retailer listings`)
  console.log(`  · ${counters.prices} historical price records`)
  console.log(`  · ${counters.matches} identity-resolution decisions (${counters.pendingMatches} pending review)`)

  await seedAmbiguousListing({ retailers })

  // Rollups must be recomputed now that the deliberately ambiguous listing exists.
  const allVariants = await db.query<{ id: string; "productId": string }>(
    `SELECT id, "productId" FROM product_variants`,
  )
  for (const row of allVariants) {
    await refreshVariantRollups(row.id)
  }
  const productIds = Array.from(new Set(allVariants.map((v) => v.productId)))
  for (const productId of productIds) {
    await refreshProductRollups(productId)
  }

  const { admin, demoUser } = await seedUsers()
  await seedUserActivity(demoUser.id)
  await seedSearchHistory()
  console.log(`  · users: ${admin.email} (ADMIN), ${demoUser.email} (USER)`)

  const summary = await db.queryOne<{
    variants: number
    listings: number
    prices: number
    productsWithPrice: number
  }>(
    `SELECT
       (SELECT count(*)::int FROM product_variants) AS variants,
       (SELECT count(*)::int FROM product_listings) AS listings,
       (SELECT count(*)::int FROM prices) AS prices,
       (SELECT count(*)::int FROM product_variants WHERE "lowestPrice" IS NOT NULL) AS "productsWithPrice"`,
  )

  console.log('\nSeed complete:')
  console.log(`  variants with a comparable price : ${summary?.productsWithPrice ?? 0}/${summary?.variants ?? 0}`)
  console.log(`  retailer listings                : ${summary?.listings ?? 0}`)
  console.log(`  price history records            : ${summary?.prices ?? 0}`)
  console.log(`  duration                         : ${((Date.now() - started) / 1000).toFixed(1)}s`)
  console.log('\nNOTE: all seeded retailer data is DEMONSTRATION data (source = DEMO).')
  await closePool()
}

main().catch(async (error) => {
  console.error('Seed failed:', error)
  await closePool()
  process.exit(1)
})
