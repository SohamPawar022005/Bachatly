import { describe, expect, it } from 'vitest'

import { andClauses, placeholders, resolvePagination, resolveSort } from '@/lib/db/query-helpers'

describe('placeholders', () => {
  it('expands a list into consecutive positional parameters', () => {
    expect(placeholders(['a', 'b', 'c'], 4)).toBe('$4, $5, $6')
  })
})

describe('andClauses', () => {
  it('builds an IN clause for array values, never = ANY with a list', () => {
    const { sql, values } = andClauses([{ column: 'c.slug', value: ['mobiles', 'smartphones'], op: 'ANY' }], 1)
    expect(sql).toBe('AND c.slug IN ($1, $2)')
    expect(values).toEqual(['mobiles', 'smartphones'])
  })

  it('skips empty arrays, null and undefined values', () => {
    const { sql, values } = andClauses(
      [
        { column: 'a', value: [], op: 'ANY' },
        { column: 'b', value: null },
        { column: 'c', value: undefined },
      ],
      1,
    )
    expect(sql).toBe('')
    expect(values).toEqual([])
  })

  it('numbers parameters across mixed conditions', () => {
    const { sql, values } = andClauses(
      [
        { column: 'p.rating', value: 4, op: '>=' },
        { column: 'lower(p.brand)', value: ['apple', 'samsung'], op: 'ANY' },
        { column: 'v."lowestPrice"', value: 500000, op: '<=' },
      ],
      3,
    )
    expect(sql).toBe('AND p.rating >= $3 AND lower(p.brand) IN ($4, $5) AND v."lowestPrice" <= $6')
    expect(values).toEqual([4, 'apple', 'samsung', 500000])
  })
})

describe('resolveSort', () => {
  it('falls back to relevance for unknown or missing sorts', () => {
    expect(resolveSort('cheapest')).toBe('cheapest')
    expect(resolveSort('DROP TABLE')).toBe('relevance')
    expect(resolveSort(undefined)).toBe('relevance')
  })
})

describe('resolvePagination', () => {
  it('clamps page and page size to sane bounds', () => {
    expect(resolvePagination(0, 0)).toEqual({ page: 1, pageSize: 12, offset: 0 })
    expect(resolvePagination(-3, 5000)).toEqual({ page: 1, pageSize: 48, offset: 0 })
    expect(resolvePagination('2', '8', 4)).toEqual({ page: 2, pageSize: 4, offset: 4 })
    expect(resolvePagination(3, 10)).toEqual({ page: 3, pageSize: 10, offset: 20 })
  })
})
