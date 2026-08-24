import { test, expect } from '@playwright/test'

test('opens and accepts a new gate while offline', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const email = `offline-${Date.now()}@example.com`

  // Register while online — gates are scoped per account, and the service
  // worker needs to install and cache the shell before going offline.
  await page.goto('/')
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Skip this step' }).click()
  await page.getByRole('button', { name: 'Enter Sesame' }).click()
  await expect(page.getByRole('heading', { name: 'Your gates' })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)

  await context.setOffline(true)
  await page.reload()

  // The wordmark is a styled <p>, not a heading — its presence after an
  // offline reload is what proves the cached shell booted.
  await expect(page.locator('.wordmark')).toBeVisible()

  // Chromium resets navigator.onLine to true on a service-worker-served
  // reload even while the context is still offline, so re-signal it — on a
  // real device in airplane mode the flag stays false on its own and this
  // dispatch is a no-op. Same emulation gap sync.spec.ts works around.
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))

  // The map is the app's one deliberate exception to full offline capability
  // (CLAUDE.md) — everything else on this page must still work regardless.
  await expect(page.getByText('Map needs an internet connection')).toBeVisible()

  await page.getByRole('button', { name: '+ Add gate' }).click()
  await page.getByLabel('Gate name', { exact: true }).fill('Oakwood Estates')
  await page.getByLabel('Code', { exact: true }).fill('0451#')
  await page.getByRole('button', { name: 'Save gate' }).click()
  await expect(page.getByRole('button', { name: 'Open Oakwood Estates' }).first()).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Open Oakwood Estates' }).first()).toBeVisible()

  await context.close()
})
