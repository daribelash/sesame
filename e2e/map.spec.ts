import { test, expect, type Page } from '@playwright/test'

// Needs a real, working VITE_GOOGLE_MAPS_API_KEY (Maps JavaScript API
// enabled, billing attached, referrer-restricted) available wherever this
// runs — including CI, where it must be wired in as a repo secret. See
// CLAUDE.md's "Maps" section.

async function registerAccount(page: Page) {
  const email = `map-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Next' }).click()
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

test('a saved gate shows a marker on the map', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 32.7767, longitude: -96.797 })

  await page.goto('/')
  await registerAccount(page)
  await saveGate(page, 'Oakwood Estates', '0451#')

  await expect(
    page.getByRole('button', { name: 'Open Oakwood Estates on the map' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Open Oakwood Estates on the map' }).click()
  const infoWindow = page.getByRole('dialog').last()
  await expect(infoWindow).toContainText('Oakwood Estates')
  await expect(infoWindow).toContainText('0451#')
})

test('long-pressing empty map space opens a prefilled add-gate sheet', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 32.7767, longitude: -96.797 })

  await page.goto('/')
  await registerAccount(page)

  const viewport = page.locator('.map-card-viewport')
  const box = await viewport.boundingBox()
  if (!box) throw new Error('map viewport did not render')

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(700) // past the 500ms long-press threshold
  await page.mouse.up()

  await expect(page.getByRole('heading', { name: 'Add a gate' })).toBeVisible()
})

test('dragging a marker in the detail sheet persists the new location', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 32.7767, longitude: -96.797 })

  await page.goto('/')
  await registerAccount(page)
  await saveGate(page, 'Oakwood Estates', '0451#')

  await page.getByRole('button', { name: 'Open Oakwood Estates' }).click()
  const originalLocation = await page.locator('.sheet .location').textContent()

  await page.getByRole('button', { name: 'Adjust location on map' }).click()
  const editorViewport = page.locator('.map-card-viewport--small')
  const box = await editorViewport.boundingBox()
  if (!box) throw new Error('location editor did not render')

  // Drag the center marker a noticeable distance within the small viewport.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.25, { steps: 5 })
  await page.mouse.up()

  await page.reload()
  await page.getByRole('button', { name: 'Open Oakwood Estates' }).click()
  const updatedLocation = await page.locator('.sheet .location').textContent()
  expect(updatedLocation).not.toBe(originalLocation)
})
