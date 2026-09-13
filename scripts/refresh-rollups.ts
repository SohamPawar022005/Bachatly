/**
 * Recomputes every variant and product rollup from stored price records.
 *
 * Useful after changing rollup rules or after identity resolution changes which
 * listings are comparable. Idempotent: it only reads prices and rewrites the
 * denormalised columns.
 *
 *   pnpm db:refresh-rollups
 */
import 'dotenv/config'

import { refreshProductRollups, refreshVariantRollups } from '@/lib/db/repositories/product-repository'
import { getDb } from '@/lib/db/client'
import { closePool } from '@/lib/db/pool'

async function main() {
  const db = await getDb()
  const started = Date.now()

  const variants = await db.query<{ id: string }>(
    `SELECT id, "productId" FROM product_variants ORDER BY "createdAt" ASC`,
  )

  for (const variant of variants) {
    await refreshVariantRollups(variant.id)
  }

  const products = await db.query<{ id: string }>(`SELECT id FROM products ORDER BY "createdAt" ASC`)
  for (const product of products) {
    await refreshProductRollups(product.id)
  }

  const summary = await db.query<{
    pricedVariants: number
    discountedVariants: number
    topDiscount: number | null
  }>(
    `SELECT count(*) FILTER (WHERE "lowestPrice" IS NOT NULL)::int AS "pricedVariants",
            count(*) FILTER (WHERE "bestDiscountPercent" > 0)::int AS "discountedVariants",
            max("bestDiscountPercent") AS "topDiscount"
       FROM product_variants`,
  )

  console.log(
    `Rollups refreshed: ${variants.length} variants, ${products.length} products in ${Date.now() - started}ms\n` +
      `· variants with a price      : ${summary[0]?.pricedVariants ?? 0}\n` +
      `· variants with a discount   : ${summary[0]?.discountedVariants ?? 0}\n` +
      `· highest discount on record : ${summary[0]?.topDiscount ?? 0}%`,
  )
}

main()
  .then(async () => {
    await closePool()
    process.exit(0)
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
