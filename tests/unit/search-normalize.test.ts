import { describe, expect, it } from 'vitest'
import {
  normalizeQuery,
  normalizeForMatching,
  tokenize,
  toTsQuery,
  escapeLike,
  trigrams,
} from '@/lib/search/normalize'

describe('query normalisation', () => {
  it('makes the spellings of one product equivalent', () => {
    const expected = 'iphone 16'
    expect(normalizeQuery('iPhone16')).toBe(expected)
    expect(normalizeQuery('iPhone 16')).toBe(expected)
    expect(normalizeQuery('IPHONE  16')).toBe(expected)
    expect(normalizeQuery('apple iphone 16')).toBe('apple iphone 16')
    expect(normalizeQuery('iphone sixteen')).toBe(expected)
  })

  it('collapses whitespace, case and punctuation', () => {
    expect(normalizeQuery('  iPhone   16!!! ')).toBe('iphone 16')
  })

  it('normalises storage notations', () => {
    expect(normalizeQuery('iphone 16 128 gb')).toBe('iphone 16 128gb')
    expect(normalizeQuery('iPhone 16 128GB')).toBe('iphone 16 128gb')
  })

  it('applies typo corrections for high volume queries', () => {
    expect(normalizeQuery('ipohne 16')).toBe('iphone 16')
    expect(normalizeQuery('macbok air')).toBe('macbook air')
  })

  it('drops stopwords for matching while keeping them out of search', () => {
    expect(normalizeForMatching('best price for iphone 16 online india')).toBe('iphone 16')
  })

  it('tokenizes', () => {
    expect(tokenize('Apple iPhone 16 128GB')).toEqual(['apple', 'iphone', '16', '128gb'])
  })

  it('builds a prefix full-text query', () => {
    expect(toTsQuery('iphone 16')).toBe(`'iphone':* & '16':*`)
    expect(toTsQuery('')).toBe('')
  })

  it('escapes LIKE wildcards so user input cannot alter the query shape', () => {
    expect(escapeLike('100% _ \\')).toBe('100\\% \\_ \\\\')
  })

  it('generates trigrams for typo-tolerant ranking', () => {
    const tri = trigrams('samsng')
    expect(tri).toContain('sam')
    expect(tri).toContain('sng')
    expect(tri.length).toBeGreaterThan(0)
  })
})
