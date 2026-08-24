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

// The gesture handlers attach to the Maps SDK's own DOM node via useMap(),
// which is null until the SDK finishes loading — gesturing before then hits
// a map with no listeners yet.
async function waitForMapReady(page: Page, viewportSelector: string) {
  // .gm-style only appears once Maps has actually constructed the map
  // instance — unlike window.google.maps, which exists as soon as the
  // loader script runs, well before useMap() returns anything.
  await expect(page.locator(`${viewportSelector} .gm-style`).first()).toBeVisible({
    timeout: 15_000,
  })
}

async function saveGate(page: Page, name: string, code: string) {
  await page.getByRole('button', { name: '+ Add gate' }).click()
  await page.getByLabel('Gate name', { exact: true }).fill(name)
  await page.getByLabel('Code', { exact: true }).fill(code)
  await page.getByRole('button', { name: 'Save gate' }).click()
  await expect(page.getByRole('button', { name: `Open ${name}` }).first()).toBeVisible()
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
  const popup = page.getByRole('dialog').last()
  await expect(popup).toContainText('Oakwood Estates')
  await expect(popup).toContainText('0451#')

  await popup.getByRole('button', { name: 'Open gate →' }).click()
  const sheet = page.getByRole('dialog', { name: 'Oakwood Estates' })
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('0451#')
})

test('long-pressing empty map space opens a prefilled add-gate sheet', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 32.7767, longitude: -96.797 })

  await page.goto('/')
  await registerAccount(page)
  await waitForMapReady(page, '.map-card-viewport')

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

  // The detail sheet no longer displays raw coordinates, so read the stored
  // lat/lng directly — that's what "persists" actually means here.
  const readStoredLocation = () =>
    page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('sesame:gates:'))
      if (!key) return null
      const gates = JSON.parse(localStorage.getItem(key) ?? '[]') as {
        name: string
        lat: number | null
        lng: number | null
      }[]
      const gate = gates.find((g) => g.name === 'Oakwood Estates')
      return gate ? `${gate.lat},${gate.lng}` : null
    })

  const originalLocation = await readStoredLocation()

  await page.getByRole('button', { name: 'Open Oakwood Estates' }).first().click()
  await page.getByRole('button', { name: 'Adjust location on map' }).click()
  await waitForMapReady(page, '.map-card-viewport--small')
  const editorViewport = page.locator('.map-card-viewport--small')
  const box = await editorViewport.boundingBox()
  if (!box) throw new Error('location editor did not render')

  // Grab the marker itself rather than assuming it sits dead-centre — the
  // pin is only 14px, so an approximate grab point misses it entirely.
  const marker = page.locator('.map-card-viewport--small .gate-marker')
  const markerBox = await marker.boundingBox()
  if (!markerBox) throw new Error('draggable marker did not render')

  await page.mouse.move(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.25, { steps: 10 })
  await page.mouse.up()

  await page.reload()
  await expect
    .poll(readStoredLocation, { timeout: 10_000 })
    .not.toBe(originalLocation)
})
