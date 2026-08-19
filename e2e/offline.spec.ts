import { test, expect } from '@playwright/test'

test('opens and accepts a new gate while offline', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const email = `offline-${Date.now()}@example.com`

  // Register while online — gates are scoped per account, and the service
  // worker needs to install and cache the shell before going offline.
  await page.goto('/')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.getByRole('button', { name: 'Need an account? Register' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.getByText(`Logged in as ${email}`)).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)

  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Sesame' })).toBeVisible()

  await page.getByLabel('Gate name').fill('Oakwood Estates')
  await page.getByLabel('Code').fill('0451#')
  await page.getByRole('button', { name: 'Save gate' }).click()
  await expect(page.getByRole('heading', { name: 'Oakwood Estates' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Oakwood Estates' })).toBeVisible()

  await context.close()
})
