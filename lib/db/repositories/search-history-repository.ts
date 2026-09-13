import { db } from '@/lib/db/client'
import { normalizeForMatching } from '@/lib/search/normalize'
import { cuid } from '@/lib/utils/id'

export interface SearchHistoryRow {
  id: string
  userId: string
  query: string
  normalizedQuery: string
  resultCount: number
  createdAt: Date
}

const SELECT_COLUMNS = `sh.id, sh."userId", sh.query, sh."normalizedQuery", sh."resultCount", sh."createdAt"`

export async function recordSearch(userId: string, query: string, resultCount: number): Promise<void> {
  const trimmed = query.trim()
  if (!trimmed) return
  await db.execute(
    `INSERT INTO search_history (id, "userId", query, "normalizedQuery", "resultCount", "createdAt")
     VALUES ($1,$2,$3,$4,$5, now())`,
    [cuid(), userId, trimmed.slice(0, 200), normalizeForMatching(trimmed).slice(0, 200), resultCount],
  )
}

export async function listRecentSearches(userId: string, limit = 20): Promise<SearchHistoryRow[]> {
  return db.query<SearchHistoryRow>(
    `SELECT DISTINCT ON (sh."normalizedQuery") ${SELECT_COLUMNS}
     FROM search_history sh
     WHERE sh."userId" = $1
     ORDER BY sh."normalizedQuery", sh."createdAt" DESC
     LIMIT $2`,
    [userId, limit],
  )
}

export async function clearSearchHistory(userId: string): Promise<number> {
  return db.execute(`DELETE FROM search_history WHERE "userId" = $1`, [userId])
}

/** Popular searches across all users, used by the homepage. */
export async function popularSearches(limit = 8): Promise<Array<{ query: string; count: number }>> {
  return db.query(
    `SELECT sh."normalizedQuery" AS query, count(*)::int AS count
     FROM search_history sh
     WHERE sh."createdAt" >= now() - interval '30 days'
     GROUP BY sh."normalizedQuery"
     ORDER BY count DESC, query ASC
     LIMIT $1`,
    [limit],
  )
}
