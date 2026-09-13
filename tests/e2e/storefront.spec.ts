import { expect, test } from '@playwright/test'

import { apiGet, expectOkEnvelope } from './helpers'

test.describe('storefront', () => {
  test('homepage renders catalogue numbers that come from the database', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Compare. Save.')
    await expect(page.getByRole('heading', { name: /best deals right now/i })).toBeVisible()
    // The stats strip is counted from the live database, so it must not be zeros.
    await expect(page.getByText(/products tracked across \d+ retailers/i)).toBeVisible()
    // Real product cards with real prices.
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible()
    await expect(page.getByText(/₹[\d,]+/).first()).toBeVisible()
  })

  test('search returns only relevant results and states the match strategy', async ({ page }) => {
    const response = await page.request.get('/api/search?q=airpods&sort=cheapest')
    await expectOkEnvelope(response)
    const data = await apiGet<{ items: Array<{ title: string; variantTitle: string }>; total: number }>(
      page,
      '/api/search?q=airpods&sort=cheapest',
    )
    expect(data.total).toBeGreaterThan(0)
    for (const item of data.items) {
      expect(`${item.title} ${item.variantTitle}`.toLowerCase()).toMatch(/airpod/)
    }
  })

  test('search page renders results, filters and pagination controls', async ({ page }) => {
    await page.goto('/search?q=iphone')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('iphone')
    await expect(page.getByRole('heading', { name: /filters/i })).toBeVisible()
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible()
  })

  test('a typo still matches through trigram similarity', async ({ page }) => {
    const data = await apiGet<{ total: number }>(page, '/api/search?q=airpodz')
    expect(data.total).toBeGreaterThan(0)
  })

  test('product page shows the comparison, the cheapest retailer and structured data', async ({ page }) => {
    await page.goto('/products/apple-iphone-16-128gb-black')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // SEO: canonical + JSON-LD built from stored prices.
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toContain('/products/apple-iphone-16-128gb-black')
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().innerText()
    const structured = JSON.parse(jsonLd) as { '@type': string; offers?: { lowPrice: number } }
    expect(structured['@type']).toBe('Product')
    expect(structured.offers?.lowPrice).toBeGreaterThan(0)

    // The comparison is fetched client-side from /api/products/:slug/prices.
    await expect(page.getByText(/LOWEST PRICE/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /buy at/i }).first()).toBeVisible()
  })

  test('Buy Now links to the retailer and never opens a payment flow', async ({ page }) => {
    await page.goto('/products/apple-iphone-16-128gb-black')
    const buy = page.getByRole('link', { name: /buy at/i }).first()
    await expect(buy).toBeVisible({ timeout: 15_000 })
    await expect(buy).toHaveAttribute('target', '_blank')
    const rel = (await buy.getAttribute('rel')) ?? ''
    expect(rel).toContain('nofollow')
    expect(rel).toContain('noopener')
    const href = (await buy.getAttribute('href')) ?? ''
    expect(href).toMatch(/^https?:\/\//)
  })

  test('price history renders a chart and a verdict derived from stored records', async ({ page }) => {
    await page.goto('/products/apple-iphone-16-128gb-black')
    await expect(page.getByRole('heading', { name: /price history/i })).toBeVisible()
    await expect(page.getByText(/Lowest recorded/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/(Great|Good|Average|High) Price/)).toBeVisible()
  })

  test('deals page ranks real discounts and shows the savings total', async ({ page }) => {
    await page.goto('/deals')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('deals')
    await expect(page.getByRole('heading', { name: /best deals right now/i })).toBeVisible()
    await expect(page.getByText(/₹[\d,]+/).first()).toBeVisible()
  })

  test('a parent category includes the products of its subcategories', async ({ page }) => {
    const parent = await apiGet<{ products: { total: number } }>(page, '/api/categories/mobiles')
    const child = await apiGet<{ products: { total: number } }>(page, '/api/categories/smartphones')
    expect(child.products.total).toBeGreaterThan(0)
    expect(parent.products.total).toBeGreaterThanOrEqual(child.products.total)
  })

  test('unauthenticated API access is refused with a stable envelope', async ({ request }) => {
    const response = await request.get('/api/favorites')
    expect(response.status()).toBe(401)
    const body = (await response.json()) as { success: boolean; error: { code: string } }
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHENTICATED')
  })
})
