import { test, expect } from '@playwright/test'

test('opens and accepts a new gate while offline', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  // Visit once online so the service worker installs and caches the shell.
  await page.goto('/')
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
