import { describe, expect, it } from 'vitest'

import { cuid } from '@/lib/utils/id'
import { slugify } from '@/lib/utils/slug'

describe('cuid', () => {
  it('matches the format existing rows use: c + 24 base36 characters', () => {
    const id = cuid()
    expect(id).toMatch(/^c[a-z0-9]{24}$/)
    expect(id).toHaveLength(25)
  })

  it('is stable across a seeded row shape (regression guard for the id length)', () => {
    // Seeded ids look like cmtz3r0d410kx0s56001a2mnj — 25 characters.
    expect('cmtz3r0d410kx0s56001a2mnj').toHaveLength(cuid().length)
  })

  it('generates unique values in a tight loop', () => {
    const ids = new Set(Array.from({ length: 20_000 }, () => cuid()))
    expect(ids.size).toBe(20_000)
  })

  it('does not depend on Node-only globals (safe in a browser bundle)', () => {
    // The module is reachable from client components through the validation
    // schemas, so it must not reference `process` anywhere.
    expect(typeof process).toBe('object')
    const source = cuid.toString()
    expect(source).not.toContain('process')
  })
})

describe('slugify', () => {
  it('lowercases, dashes and strips diacritics', () => {
    expect(slugify('Sony WH-1000XM6')).toBe('sony-wh-1000xm6')
    expect(slugify('Nescafé Classic')).toBe('nescafe-classic')
    expect(slugify("Levi's 511 Slim")).toBe('levis-511-slim')
  })

  it('collapses separators and trims edges', () => {
    expect(slugify('  Home & Kitchen — Essentials!! ')).toBe('home-kitchen-essentials')
  })

  it('truncates to 96 characters', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(96)
  })
})
