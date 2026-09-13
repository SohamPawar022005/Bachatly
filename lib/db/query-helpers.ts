/** Small helpers for building parameterised SQL safely. */

export interface SqlFragment {
  text: string
  values: unknown[]
}

/**
 * Expands an array into `$n, $n+1, ...` placeholders.
 * Never interpolate user input into SQL text — always bind it.
 */
export function placeholders(values: readonly unknown[], startIndex: number): string {
  return values.map((_, i) => `$${startIndex + i}`).join(', ')
}

/** Builds `AND key = $n` clauses, skipping undefined/null values. */
export function andClauses(
  conditions: Array<{ column: string; value: unknown; op?: '=' | '>=' | '<=' | '>' | '<' | 'ILIKE' | 'ANY' } | false | null | undefined>,
  startIndex: number,
): { sql: string; values: unknown[]; nextIndex: number } {
  const values: unknown[] = []
  const clauses: string[] = []
  let index = startIndex
  for (const condition of conditions) {
    if (!condition) continue
    if (condition.value === undefined || condition.value === null) continue
    const op = condition.op ?? '='
    if (op === 'ANY') {
      const list = condition.value as unknown[]
      if (list.length === 0) continue
      // IN (...) rather than = ANY(...): ANY takes a single array expression,
      // so an expanded placeholder list must not be wrapped in it.
      clauses.push(`${condition.column} IN (${placeholders(list, index)})`)
      values.push(...list)
      index += list.length
      continue
    }
    clauses.push(`${condition.column} ${op} $${index}`)
    values.push(condition.value)
    index += 1
  }
  return { sql: clauses.length ? `AND ${clauses.join(' AND ')}` : '', values, nextIndex: index }
}

const SORTABLE = new Set(['cheapest', 'price_desc', 'discount', 'rating', 'delivery', 'newest', 'relevance'])

export function resolveSort(input: string | undefined): string {
  return input && SORTABLE.has(input) ? input : 'relevance'
}

export interface Pagination {
  page: number
  pageSize: number
  offset: number
}

export function resolvePagination(rawPage: unknown, rawSize: unknown, maxPageSize = 48): Pagination {
  const page = Math.max(1, Number.parseInt(String(rawPage ?? 1), 10) || 1)
  const size = Math.min(maxPageSize, Math.max(1, Number.parseInt(String(rawSize ?? 12), 10) || 12))
  return { page, pageSize: size, offset: (page - 1) * size }
}

import { getDb } from '@/lib/db/client'
import type { DatabaseClient } from '@/lib/db/types'

/** Use the supplied transactional client, or the shared pool when none is given. */
export async function withClient(client?: DatabaseClient): Promise<DatabaseClient> {
  return client ?? (await getDb())
}
