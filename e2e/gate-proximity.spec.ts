import { test, expect, type Page } from '@playwright/test'

// Two points along the same meridian, ~2 miles apart (1 degree of latitude
// is ~69 miles), so the app's own haversine math is what separates them.
const positionA = { latitude: 32.7767, longitude: -96.797 }
const positionB = { latitude: 32.7767 + 2 / 69, longitude: -96.797 }

// Gates are scoped per account, so every test needs one of its own.
async function registerAccount(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.getByRole('button', { name: 'Need an account? Register' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.getByText(`Logged in as ${email}`)).toBeVisible()
}

async function saveGate(page: Page, name: string, code: string) {
  await page.getByLabel('Gate name').fill(name)
  await page.getByLabel('Code').fill(code)
  await page.getByRole('button', { name: 'Save gate' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

function firstGateHeading(page: Page) {
  return page.locator('.gate h2').first()
}

test('the gate at your current position is top of the list', async ({ browser }) => {
  const context = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: positionA,
  })
  const page = await context.newPage()
  await page.goto('/')
  await registerAccount(page)

  await saveGate(page, 'Oakwood Estates', '0451#')

  // Reload so the app re-reads the current position used for sorting.
  await page.reload()

  await expect(firstGateHeading(page)).toHaveText('Oakwood Estates')

  await context.close()
})

test('ordering changes when the phone moves to a different saved gate', async ({ browser }) => {
  const context = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: positionA,
  })
  const page = await context.newPage()
  await page.goto('/')
  await registerAccount(page)

  await saveGate(page, 'Oakwood Estates', '0451#')

  await context.setGeolocation(positionB)
  await saveGate(page, 'Cedar Ridge', '7788')

  await context.setGeolocation(positionA)
  await page.reload()
  await expect(firstGateHeading(page)).toHaveText('Oakwood Estates')

  await context.setGeolocation(positionB)
  await page.reload()
  await expect(firstGateHeading(page)).toHaveText('Cedar Ridge')

  await context.close()
})

test('the list still renders when location permission is denied', async ({ browser }) => {
  // No 'geolocation' permission granted — Chrome auto-denies the request.
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/')
  await registerAccount(page)

  await saveGate(page, 'Oakwood Estates', '0451#')
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Oakwood Estates' })).toBeVisible()

  await context.close()
})
