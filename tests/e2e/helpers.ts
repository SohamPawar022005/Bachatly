import { expect, type Page } from '@playwright/test'

export const DEMO_USER = { email: 'demo@bachatly.app', password: 'Demo@12345' }
export const ADMIN_USER = { email: 'admin@bachatly.app', password: 'Admin@12345' }

/** Signs in through the real Auth.js credentials flow (no token stubbing). */
export async function signIn(page: Page, user = DEMO_USER) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
}

/** Asserts the API envelope shape on a response. */
export async function expectOkEnvelope(response: { json(): Promise<unknown> }) {
  const body = (await response.json()) as { success?: boolean; data?: unknown; error?: unknown }
  expect(body.success).toBe(true)
  expect(body.data).toBeDefined()
}

export async function apiGet<T>(page: Page, path: string): Promise<T> {
  const response = await page.request.get(path)
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as { success: boolean; data: T }
  expect(body.success).toBe(true)
  return body.data
}
