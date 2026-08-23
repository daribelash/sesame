import { test, expect, type Page } from '@playwright/test'

// Two points along the same meridian, ~2 miles apart (1 degree of latitude
// is ~69 miles), so the app's own haversine math is what separates them.
const positionA = { latitude: 32.7767, longitude: -96.797 }
const positionB = { latitude: 32.7767 + 2 / 69, longitude: -96.797 }

// Gates are scoped per account, so every test needs one of its own.
async function registerAccount(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Next' }).click()
  // Skip the save-first-gate step — tests add gates explicitly via saveGate.
  await page.getByRole('button', { name: 'Skip this step' }).click()
  await page.getByRole('button', { name: 'Enter Sesame' }).click()
  await expect(page.getByRole('heading', { name: 'Your gates' })).toBeVisible()
}

async function saveGate(page: Page, name: string, code: string) {
  await page.getByRole('button', { name: '+ Add gate' }).click()
  await page.getByLabel('Gate name').fill(name)
  await page.getByLabel('Code').fill(code)
  await page.getByRole('button', { name: 'Save gate' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

function firstGateHeading(page: Page) {
  return page.locator('.gate-list .gate-card h2').first()
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

test('deleting a gate removes it, and it stays gone after reload', async ({ browser }) => {
  const context = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: positionA,
  })
  const page = await context.newPage()
  await page.goto('/')
  await registerAccount(page)

  await saveGate(page, 'Oakwood Estates', '0451#')

  await page.getByRole('button', { name: 'Open Oakwood Estates' }).click()
  await page.getByRole('button', { name: 'Delete gate' }).click()
  await page.getByRole('button', { name: 'Confirm delete' }).click()
  await expect(page.getByRole('heading', { name: 'Oakwood Estates' })).not.toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Oakwood Estates' })).not.toBeVisible()

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
