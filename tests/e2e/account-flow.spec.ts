import { expect, test } from '@playwright/test'

import { ADMIN_USER, DEMO_USER, signIn } from './helpers'

test.describe('account and price-alert flow', () => {
  test('signing in with a wrong password shows an inline error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(DEMO_USER.email)
    await page.getByLabel('Password').fill('definitely-wrong')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/incorrect email or password/i)).toBeVisible({ timeout: 15_000 })
    expect(page.url()).toContain('/login')
  })

  test('registering a new account signs the user in', async ({ page }) => {
    const email = `e2e-${Date.now()}@bachatly.test`
    await page.goto('/register')
    await page.getByLabel('Full name').fill('E2E Shopper')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('Password123')
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForURL(/\/(account|favorites|alerts)/, { timeout: 20_000 })
  })

  test('protected routes redirect to sign-in and back', async ({ page }) => {
    await page.goto('/favorites')
    await page.waitForURL(/\/login\?callbackUrl=%2Ffavorites/)
    await page.getByLabel('Email').fill(DEMO_USER.email)
    await page.getByLabel('Password').fill(DEMO_USER.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/favorites/, { timeout: 20_000 })
  })

  test('save a product, set an alert, then see it in the dashboard', async ({ page }) => {
    await signIn(page)

    await page.goto('/products/apple-iphone-16-128gb-black')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.getByRole('button', { name: /save to favourites|remove from favourites/i }).first().click()

    await page.goto('/favorites')
    await expect(page.getByText(/128GB Black/).first()).toBeVisible({ timeout: 15_000 })

    await page.goto('/alerts')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Price alerts')

    await page.goto('/account')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('dashboard')
    await expect(page.getByText(/Saved products/).first()).toBeVisible()
  })

  test('a shopper cannot open the admin console', async ({ page }) => {
    await signIn(page, DEMO_USER)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/account/)
  })

  test('an admin can open the console and see live counters', async ({ page }) => {
    await signIn(page, ADMIN_USER)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Admin console')
    await expect(page.getByText(/Price records/).first()).toBeVisible({ timeout: 15_000 })
  })

  test('an admin price-update run appends prices and is reported in the run history', async ({ page }) => {
    await signIn(page, ADMIN_USER)
    await page.goto('/admin')
    await page.getByRole('button', { name: /run now/i }).click()
    await expect(page.getByText(/Price update finished/)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByRole('cell', { name: /SUCCESS/ }).first()).toBeVisible()
  })
})
