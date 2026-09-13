import { db } from '@/lib/db/client'
import { startOfUtcDay } from '@/lib/utils/time'

export interface DashboardStats {
  totalUsers: number
  totalProducts: number
  totalVariants: number
  totalRetailers: number
  activeRetailers: number
  totalListings: number
  totalPriceRecords: number
  activeAlerts: number
  totalFavorites: number
  productsUpdatedToday: number
  listingsCheckedToday: number
  pendingMatches: number
  unmatchedListings: number
  notificationsSent: number
  lastPriceUpdateRun: {
    id: string
    status: string
    triggeredBy: string
    listingsChecked: number
    priceRecordsCreated: number
    alertsTriggered: number
    startedAt: Date
    finishedAt: Date | null
  } | null
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = startOfUtcDay()
  const [row, run] = await Promise.all([
    db.queryOne<Omit<DashboardStats, 'lastPriceUpdateRun'>>(
      `SELECT
         (SELECT count(*)::int FROM users) AS "totalUsers",
         (SELECT count(*)::int FROM products) AS "totalProducts",
         (SELECT count(*)::int FROM product_variants) AS "totalVariants",
         (SELECT count(*)::int FROM retailers) AS "totalRetailers",
         (SELECT count(*)::int FROM retailers WHERE "isActive") AS "activeRetailers",
         (SELECT count(*)::int FROM product_listings) AS "totalListings",
         (SELECT count(*)::int FROM prices) AS "totalPriceRecords",
         (SELECT count(*)::int FROM price_alerts WHERE "isActive") AS "activeAlerts",
         (SELECT count(*)::int FROM favorites) AS "totalFavorites",
         (SELECT count(*)::int FROM products WHERE "updatedAtPriceAt" >= $1) AS "productsUpdatedToday",
         (SELECT count(*)::int FROM product_listings WHERE "lastCheckedAt" >= $1) AS "listingsCheckedToday",
         (SELECT count(*)::int FROM product_listings WHERE "resolutionStatus" = 'PENDING') AS "pendingMatches",
         (SELECT count(*)::int FROM product_listings WHERE "resolutionStatus" = 'UNMATCHED') AS "unmatchedListings",
         (SELECT count(*)::int FROM notifications) AS "notificationsSent"`,
      [today],
    ),
    db.queryOne<NonNullable<DashboardStats['lastPriceUpdateRun']>>(
      `SELECT id, status, "triggeredBy", "listingsChecked", "priceRecordsCreated", "alertsTriggered",
              "startedAt", "finishedAt"
       FROM price_update_runs ORDER BY "startedAt" DESC LIMIT 1`,
    ),
  ])
  return {
    totalUsers: row?.totalUsers ?? 0,
    totalProducts: row?.totalProducts ?? 0,
    totalVariants: row?.totalVariants ?? 0,
    totalRetailers: row?.totalRetailers ?? 0,
    activeRetailers: row?.activeRetailers ?? 0,
    totalListings: row?.totalListings ?? 0,
    totalPriceRecords: row?.totalPriceRecords ?? 0,
    activeAlerts: row?.activeAlerts ?? 0,
    totalFavorites: row?.totalFavorites ?? 0,
    productsUpdatedToday: row?.productsUpdatedToday ?? 0,
    listingsCheckedToday: row?.listingsCheckedToday ?? 0,
    pendingMatches: row?.pendingMatches ?? 0,
    unmatchedListings: row?.unmatchedListings ?? 0,
    notificationsSent: row?.notificationsSent ?? 0,
    lastPriceUpdateRun: run ?? null,
  }
}

export interface JobRunRow {
  id: string
  status: 'RUNNING' | 'SUCCESS' | 'FAILED'
  triggeredBy: string
  listingsChecked: number
  priceRecordsCreated: number
  alertsTriggered: number
  notificationsSent: number
  startedAt: Date
  finishedAt: Date | null
  error: string | null
}

export async function startJobRun(triggeredBy: string): Promise<JobRunRow> {
  const row = await db.queryOne<JobRunRow>(
    `INSERT INTO price_update_runs (id, status, "triggeredBy", "startedAt")
     VALUES (gen_random_uuid()::text, 'RUNNING', $1, now())
     RETURNING id, status, "triggeredBy", "listingsChecked", "priceRecordsCreated", "alertsTriggered",
               "notificationsSent", "startedAt", "finishedAt", error`,
    [triggeredBy],
  )
  return row!
}

export async function finishJobRun(
  id: string,
  patch: {
    status: 'SUCCESS' | 'FAILED'
    listingsChecked: number
    priceRecordsCreated: number
    alertsTriggered: number
    notificationsSent: number
    error?: string | null
  },
): Promise<void> {
  await db.execute(
    `UPDATE price_update_runs SET
        status = $2, "listingsChecked" = $3, "priceRecordsCreated" = $4,
        "alertsTriggered" = $5, "notificationsSent" = $6, error = $7, "finishedAt" = now()
     WHERE id = $1`,
    [id, patch.status, patch.listingsChecked, patch.priceRecordsCreated, patch.alertsTriggered, patch.notificationsSent, patch.error ?? null],
  )
}

export async function listJobRuns(limit = 10): Promise<JobRunRow[]> {
  return db.query<JobRunRow>(
    `SELECT id, status, "triggeredBy", "listingsChecked", "priceRecordsCreated", "alertsTriggered",
            "notificationsSent", "startedAt", "finishedAt", error
     FROM price_update_runs ORDER BY "startedAt" DESC LIMIT $1`,
    [limit],
  )
}

export interface IdentityMatchRow {
  id: string
  listingId: string
  productVariantId: string | null
  rawTitle: string
  score: number
  breakdown: unknown
  status: 'ACCEPTED' | 'PENDING' | 'REJECTED'
  createdAt: Date
}

export async function recordIdentityMatch(input: {
  listingId: string
  productVariantId: string | null
  rawTitle: string
  score: number
  breakdown: unknown
  status: 'ACCEPTED' | 'PENDING' | 'REJECTED'
}): Promise<void> {
  await db.execute(
    `INSERT INTO identity_matches (id, "listingId", "productVariantId", "rawTitle", score, breakdown, status, "createdAt")
     VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6, now())`,
    [input.listingId, input.productVariantId, input.rawTitle, input.score, JSON.stringify(input.breakdown), input.status],
  )
}
