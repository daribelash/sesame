import { test, expect } from '@playwright/test'

test('a gate added offline syncs once back online, and restores after clearing local storage', async ({
  browser,
}) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const email = `sync-${Date.now()}@example.com`

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

  await page.getByRole('button', { name: '+ Add gate' }).click()
  await page.getByLabel('Gate name', { exact: true }).fill('Oakwood Estates')
  await page.getByLabel('Code', { exact: true }).fill('0451#')
  await page.getByRole('button', { name: 'Save gate' }).click()
  await expect(page.getByRole('button', { name: 'Open Oakwood Estates' }).first()).toBeVisible()

  await context.setOffline(false)

  // Confirm it actually reached Postgres, not just that the UI looks right.
  // Re-dispatch 'online' on every poll: the first dispatch can race
  // Playwright's network layer actually flipping back on, and there's no
  // retry after a single missed attempt otherwise.
  await expect
    .poll(
      async () => {
        await page.evaluate(() => window.dispatchEvent(new Event('online')))
        const response = await page.request.get('/api/gates')
        const gates = (await response.json()) as { name: string }[]
        return gates.some((gate) => gate.name === 'Oakwood Estates')
      },
      { timeout: 10_000 },
    )
    .toBe(true)

  // Wipe local storage and confirm the gate restores from the server. The
  // session cookie survives (it isn't in localStorage), so the app
  // re-authenticates and pulls the gate back down.
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await expect(page.getByRole('button', { name: 'Open Oakwood Estates' }).first()).toBeVisible()

  await context.close()
})
