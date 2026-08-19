import { test, expect } from '@playwright/test'

test('a gate added offline syncs once back online, and restores after clearing local storage', async ({
  browser,
}) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const email = `sync-${Date.now()}@example.com`

  await page.goto('/')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.getByRole('button', { name: 'Need an account? Register' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.getByText(`Logged in as ${email}`)).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)

  await context.setOffline(true)

  await page.getByLabel('Gate name').fill('Oakwood Estates')
  await page.getByLabel('Code').fill('0451#')
  await page.getByRole('button', { name: 'Save gate' }).click()
  await expect(page.getByRole('heading', { name: 'Oakwood Estates' })).toBeVisible()

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

  await expect(page.getByRole('heading', { name: 'Oakwood Estates' })).toBeVisible()

  await context.close()
})
