import { describe, expect, it } from 'vitest'
import { scoreMatch, MATCH_THRESHOLDS } from '@/lib/matching/score'
import { titleSimilarity, jaccardTokens } from '@/lib/matching/similarity'
import { extractAttributes, normalizeColor, normalizeStorage, normalizeGtin } from '@/lib/matching/attributes'

describe('attribute extraction', () => {
  it('extracts brand, storage and colour from retailer titles', () => {
    expect(extractAttributes('Apple iPhone 16 128GB Black')).toMatchObject({
      brand: 'apple',
      storage: '128gb',
      color: 'black',
    })
    expect(extractAttributes('Apple iPhone16 - Black, 128 GB')).toMatchObject({
      brand: 'apple',
      storage: '128gb',
      color: 'black',
    })
  })

  it('normalises storage units and colour synonyms', () => {
    expect(normalizeStorage('128 GB')).toBe('128gb')
    expect(normalizeStorage('1 TB')).toBe('1tb')
    expect(normalizeStorage('no storage info')).toBeNull()
    expect(normalizeColor('Space Grey')).toBe('gray')
    expect(normalizeColor('Midnight')).toBe('black')
    // Marketing prefixes collapse onto the base colour so the same physical
    // colour sold under different names still matches.
    expect(normalizeColor('Iron Gray')).toBe('gray')
    expect(normalizeColor('Titanium Gray')).toBe('gray')
    expect(normalizeColor('Obsidian')).toBe('black')
    expect(normalizeColor('Dark Indigo')).toBe('indigo')
  })

  it('only accepts valid barcode lengths as GTIN', () => {
    expect(normalizeGtin('8901234567890')).toBe('8901234567890')
    expect(normalizeGtin('12345')).toBeNull()
  })
})

describe('title similarity', () => {
  it('treats the same product described differently as very similar', () => {
    const a = 'Apple iPhone 16 128GB Black'
    const b = 'Apple iPhone16 - Black, 128 GB'
    expect(titleSimilarity(a, b)).toBeGreaterThan(0.7)
    expect(jaccardTokens(a, b)).toBeGreaterThan(0.6)
  })

  it('scores unrelated products low', () => {
    expect(titleSimilarity('Apple iPhone 16 128GB Black', 'Samsung Galaxy S24 Ultra 256GB Titanium')).toBeLessThan(0.2)
  })
})

describe('identity resolution scoring', () => {
  const amazon = { title: 'Apple iPhone 16 128GB Black', brand: 'Apple', storage: '128GB', color: 'Black' }

  it('auto-merges the same variant across retailers', () => {
    const result = scoreMatch({ title: 'Apple iPhone16 - Black, 128 GB' }, amazon)
    expect(result.score).toBeGreaterThanOrEqual(MATCH_THRESHOLDS.autoMerge)
    expect(result.decision).toBe('AUTO_MERGE')
    expect(result.conflicts).toEqual([])
  })

  it('gives a conclusive score on a GTIN match', () => {
    const result = scoreMatch(
      { title: 'Totally different wording here', gtin: '8901234567890' },
      { title: 'Apple iPhone 16 128GB Black', gtin: '8901234567890' },
    )
    expect(result.score).toBe(100)
    expect(result.decision).toBe('AUTO_MERGE')
  })

  it('never merges different storage capacities', () => {
    const result = scoreMatch(
      { title: 'Apple iPhone 16 256GB Black', brand: 'Apple', storage: '256GB', color: 'Black' },
      amazon,
    )
    expect(result.conflicts).toContain('storage')
    expect(result.decision).toBe('REJECT')
  })

  it('does not auto-merge different colours', () => {
    const result = scoreMatch(
      { title: 'Apple iPhone 16 128GB Pink', brand: 'Apple', storage: '128GB', color: 'Pink' },
      amazon,
    )
    expect(result.conflicts).toContain('color')
    expect(result.decision).not.toBe('AUTO_MERGE')
  })

  it('rejects on conflicting GTINs even with identical titles', () => {
    const result = scoreMatch(
      { title: 'Apple iPhone 16 128GB Black', gtin: '8901234567890' },
      { title: 'Apple iPhone 16 128GB Black', gtin: '8901234567891' },
    )
    expect(result.conflicts).toContain('gtin')
    expect(result.decision).toBe('REJECT')
  })

  it('rejects different brands', () => {
    const result = scoreMatch(
      { title: 'Samsung Galaxy S24 128GB Black', brand: 'Samsung', storage: '128GB', color: 'Black' },
      amazon,
    )
    expect(result.conflicts).toContain('brand')
    expect(result.decision).toBe('REJECT')
  })

  it('routes weak evidence to review instead of merging', () => {
    const result = scoreMatch(
      { title: 'Apple iPhone 16 Case Cover Black', brand: 'Apple', color: 'Black' },
      { title: 'Apple iPhone 16 128GB Black', brand: 'Apple', storage: '128GB', color: 'Black' },
    )
    expect(['REVIEW', 'REJECT']).toContain(result.decision)
    expect(result.score).toBeLessThan(MATCH_THRESHOLDS.autoMerge)
  })

  it('never merges an accessory with the device itself', () => {
    const result = scoreMatch(
      { title: 'iPhone 16 Case Cover Combo Latest Design', color: 'Black' },
      { title: 'Apple iPhone 16 128GB Black', brand: 'Apple', storage: '128GB', color: 'Black' },
    )
    expect(result.conflicts).toContain('accessory')
    expect(result.decision).toBe('REJECT')
  })

  it('merges a brand-less marketplace title when the whole model phrase matches', () => {
    const result = scoreMatch(
      { title: 'Air Zoom Pegasus 41 Running Shoes Black Size 9 Latest Model Best Quality' },
      { title: 'Nike Air Zoom Pegasus 41 Running Shoes Black Size 9', brand: 'Nike', color: 'Black', size: '9' },
    )
    expect(result.conflicts).toEqual([])
    expect(result.decision).toBe('AUTO_MERGE')
  })

  it('produces an auditable breakdown', () => {
    const result = scoreMatch({ title: 'Apple iPhone16 - Black, 128 GB' }, amazon)
    expect(result.breakdown.length).toBeGreaterThan(0)
    expect(result.breakdown.every((b) => typeof b.points === 'number' && b.label.length > 0)).toBe(true)
  })
})
