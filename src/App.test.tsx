import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import App from './App'

/** The add-gate form lives behind a bottom sheet, opened by "+ Add gate". */
async function openAddGateSheet(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: '+ Add gate' }))
}

const originalGeolocation = navigator.geolocation
const testUser = { id: 'user-1', email: 'driver@example.com' }

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: originalGeolocation,
    configurable: true,
  })
  vi.unstubAllGlobals()
})

function mockFetchRouter(handlers: Record<string, { status: number; body: unknown }>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`
    const handler = handlers[key]
    if (!handler) throw new Error(`Unhandled fetch in test: ${key}`)
    return {
      ok: handler.status >= 200 && handler.status < 300,
      status: handler.status,
      json: () => Promise.resolve(handler.body),
    }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Most tests care about gate behaviour, not the auth flow itself — this
 * mocks the common case of an already-logged-in returning user, with an
 * empty remote gate/address list unless overridden. */
function mockLoggedIn(remoteGates: unknown[] = [], remoteAddresses: unknown[] = []) {
  return mockFetchRouter({
    'GET /api/me': { status: 200, body: testUser },
    'GET /api/gates': { status: 200, body: remoteGates },
    'POST /api/gates': { status: 200, body: { ok: true } },
    'GET /api/addresses': { status: 200, body: remoteAddresses },
    'POST /api/addresses': { status: 200, body: { ok: true } },
  })
}

beforeEach(() => {
  localStorage.clear()
})

describe('App', () => {
  it('adds a gate to the list on submit', async () => {
    mockLoggedIn()
    const user = userEvent.setup()
    render(<App />)

    await openAddGateSheet(user)
    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.type(screen.getByLabelText('Notes'), 'call box on the right')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    const card = (
      (await screen.findAllByRole('button', { name: 'Open Oakwood Estates' }))[0]
    ).closest('li')!
    expect(within(card).getByText('0451#')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Open Oakwood Estates' })[0])
    expect(
      within(screen.getByRole('dialog')).getByText('call box on the right'),
    ).toBeInTheDocument()
  })

  it('creates an address too when one is entered on the add-gate form', async () => {
    mockLoggedIn()
    const user = userEvent.setup()
    render(<App />)

    await openAddGateSheet(user)
    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.type(screen.getByLabelText('Address (optional)'), '123 Oak Lane')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    await screen.findAllByRole('button', { name: 'Open Oakwood Estates' })
    await user.click(screen.getAllByRole('button', { name: 'Open Oakwood Estates' })[0])
    expect(screen.getByText('123 Oak Lane')).toBeInTheDocument()
  })

  it('does not create an address when the field is left blank', async () => {
    mockLoggedIn()
    const user = userEvent.setup()
    render(<App />)

    await openAddGateSheet(user)
    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    await user.click((await screen.findAllByRole('button', { name: 'Open Oakwood Estates' }))[0])
    expect(
      within(screen.getByRole('dialog')).getByText(/^0 addresses · updated/),
    ).toBeInTheDocument()
  })

  it('closes the sheet after a successful submit, with a blank form next time', async () => {
    mockLoggedIn()
    const user = userEvent.setup()
    render(<App />)

    await openAddGateSheet(user)
    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    await screen.findAllByRole('button', { name: 'Open Oakwood Estates' })
    expect(screen.queryByLabelText('Gate name')).not.toBeInTheDocument()

    await openAddGateSheet(user)
    expect(screen.getByLabelText('Gate name')).toHaveValue('')
    expect(screen.getByLabelText('Code')).toHaveValue('')
  })

  it('searching an address surfaces its gate, current code, and previous code', async () => {
    mockLoggedIn()
    const user = userEvent.setup()
    render(<App />)

    await openAddGateSheet(user)
    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))
    await screen.findAllByRole('button', { name: 'Open Oakwood Estates' })

    await user.click(screen.getAllByRole('button', { name: 'Open Oakwood Estates' })[0])
    const sheet = within(screen.getByRole('dialog'))
    await user.click(sheet.getByRole('button', { name: 'Edit' }))
    await user.clear(sheet.getByLabelText('Code'))
    await user.type(sheet.getByLabelText('Code'), '9999')
    await user.click(sheet.getByRole('button', { name: 'Save' }))
    await sheet.findByText('9999')

    await user.click(sheet.getByRole('button', { name: 'Add address' }))
    await user.type(sheet.getByLabelText('New address'), '123 Oak Lane')
    await user.click(sheet.getByRole('button', { name: 'Add' }))
    await sheet.findByText('123 Oak Lane')

    await user.click(sheet.getByRole('button', { name: 'Close' }))
    await user.type(screen.getByLabelText('Search by gate name or address'), 'Oak Lane')

    const results = screen
      .getByRole('heading', { level: 3, name: 'Oakwood Estates' })
      .closest('li')!
    expect(results).toHaveTextContent('9999')
    expect(results).toHaveTextContent('Previously: 0451#')
    expect(results).toHaveTextContent('123 Oak Lane')
  })

  it('changing a code shows it as history, with the new code current', async () => {
    mockLoggedIn()
    const user = userEvent.setup()
    render(<App />)

    await openAddGateSheet(user)
    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))
    await screen.findAllByRole('button', { name: 'Open Oakwood Estates' })

    await user.click(screen.getAllByRole('button', { name: 'Open Oakwood Estates' })[0])
    const sheet = within(screen.getByRole('dialog'))
    await user.click(sheet.getByRole('button', { name: 'Edit' }))
    const input = sheet.getByLabelText('Code')
    await user.clear(input)
    await user.type(input, '9999')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(await sheet.findByText('9999')).toBeInTheDocument()
    expect(sheet.getByText(/Previously 0451#/)).toBeInTheDocument()
  })

  it('still saves a gate when location permission is denied', async () => {
    mockLoggedIn()
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (
          _success: PositionCallback,
          error: PositionErrorCallback,
        ) => error({ code: 1 } as GeolocationPositionError),
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(<App />)

    await openAddGateSheet(user)
    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    expect(
      (await screen.findAllByRole('button', { name: 'Open Oakwood Estates' }))[0],
    ).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Open Oakwood Estates' })[0])
    expect(screen.getByText('No location recorded')).toBeInTheDocument()
  })

  it('loads previously saved gates for the logged-in account on mount', async () => {
    mockLoggedIn()
    localStorage.setItem(
      `sesame:gates:${testUser.id}`,
      JSON.stringify([
        {
          id: '1',
          name: 'Riverbend',
          code: '7788',
          notes: '',
          lat: null,
          lng: null,
          accuracy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          codeHistory: [],
        },
      ]),
    )

    render(<App />)

    expect(
      (await screen.findAllByRole('button', { name: 'Open Riverbend' }))[0],
    ).toBeInTheDocument()
  })

  it('never shows gates saved under a different account', async () => {
    localStorage.setItem(
      'sesame:gates:some-other-user',
      JSON.stringify([
        {
          id: '1',
          name: "Someone else's gate",
          code: '7788',
          notes: '',
          lat: null,
          lng: null,
          accuracy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          codeHistory: [],
        },
      ]),
    )
    mockLoggedIn()

    render(<App />)

    await screen.findByRole('button', { name: '+ Add gate' })
    expect(screen.queryByText("Someone else's gate")).not.toBeInTheDocument()
  })

  it('shows the splash screen instead of the gate form when logged out', async () => {
    mockFetchRouter({ 'GET /api/me': { status: 401, body: { error: 'Unauthorized' } } })

    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Never dig for a gate code again.' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Add gate' })).not.toBeInTheDocument()
  })

  it('logs in via the splash screen, reaches the welcome-back confirmation, then home', async () => {
    mockFetchRouter({
      'GET /api/me': { status: 401, body: { error: 'Unauthorized' } },
      'POST /api/login': { status: 200, body: testUser },
      'POST /api/logout': { status: 204, body: null },
      'GET /api/gates': { status: 200, body: [] },
      'POST /api/gates': { status: 200, body: { ok: true } },
      'GET /api/addresses': { status: 200, body: [] },
      'POST /api/addresses': { status: 200, body: { ok: true } },
    })

    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'I already have an account' }))
    await user.type(screen.getByLabelText('Email'), testUser.email)
    await user.type(screen.getByLabelText('Password'), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    // Login skips the save-first-gate step entirely and lands on "Welcome back."
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enter Sesame' }))

    expect(await screen.findByRole('heading', { name: 'Your gates' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Add gate' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(
      await screen.findByRole('heading', { name: 'Never dig for a gate code again.' }),
    ).toBeInTheDocument()
  })

  it('stays logged in offline using the cached identity, even when /api/me is unreachable', async () => {
    localStorage.setItem('sesame:user', JSON.stringify(testUser))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    render(<App />)

    expect(await screen.findByRole('button', { name: '+ Add gate' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Never dig for a gate code again.' }),
    ).not.toBeInTheDocument()
  })

  it('returns to the splash screen without logging in when Back is clicked', async () => {
    mockFetchRouter({ 'GET /api/me': { status: 401, body: { error: 'Unauthorized' } } })

    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'I already have an account' }))
    expect(screen.getByLabelText('Email')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '← Back' }))

    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Never dig for a gate code again.' }),
    ).toBeInTheDocument()
  })

  it('completes register → save first gate → confirmation → home', async () => {
    mockFetchRouter({
      'GET /api/me': { status: 401, body: { error: 'Unauthorized' } },
      'POST /api/register': { status: 201, body: testUser },
      'GET /api/gates': { status: 200, body: [] },
      'POST /api/gates': { status: 200, body: { ok: true } },
      'GET /api/addresses': { status: 200, body: [] },
      'POST /api/addresses': { status: 200, body: { ok: true } },
    })

    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Get started' }))
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email'), testUser.email)
    await user.type(screen.getByLabelText('Password'), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Save your first gate' }),
    ).toBeInTheDocument()
    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    expect(await screen.findByRole('heading', { name: "You're all set." })).toBeInTheDocument()
    expect(screen.getByText('Oakwood Estates')).toBeInTheDocument()
    expect(screen.getByText('0451#')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enter Sesame' }))

    expect(await screen.findByRole('heading', { name: 'Your gates' })).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'Open Oakwood Estates' })[0],
    ).toBeInTheDocument()
  })

  it('completes register → skip first gate → confirmation → home', async () => {
    mockFetchRouter({
      'GET /api/me': { status: 401, body: { error: 'Unauthorized' } },
      'POST /api/register': { status: 201, body: testUser },
      'GET /api/gates': { status: 200, body: [] },
      'POST /api/gates': { status: 200, body: { ok: true } },
      'GET /api/addresses': { status: 200, body: [] },
      'POST /api/addresses': { status: 200, body: { ok: true } },
    })

    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Get started' }))
    await user.type(screen.getByLabelText('Email'), testUser.email)
    await user.type(screen.getByLabelText('Password'), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await user.click(await screen.findByRole('button', { name: 'Skip this step' }))

    expect(await screen.findByRole('heading', { name: "You're all set." })).toBeInTheDocument()
    expect(screen.getByText("Add a gate whenever you're ready.")).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enter Sesame' }))

    expect(await screen.findByRole('heading', { name: 'Your gates' })).toBeInTheDocument()
  })

  it('pulls gates from the server on login, restoring what local storage lost', async () => {
    const remoteGate = {
      id: 'remote-1',
      name: 'Riverbend',
      code: '7788',
      notes: '',
      lat: null,
      lng: null,
      accuracy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      codeHistory: [],
    }
    mockLoggedIn([remoteGate])

    render(<App />)

    expect(
      (await screen.findAllByRole('button', { name: 'Open Riverbend' }))[0],
    ).toBeInTheDocument()
  })

  it('shows a quiet status while syncing, and an error note when it fails', async () => {
    mockLoggedIn()
    const user = userEvent.setup()
    render(<App />)

    await openAddGateSheet(user)
    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    // The add re-triggers a sync; it resolves against the same mock, so the
    // app settles back to no visible status rather than staying stuck.
    await screen.findAllByRole('button', { name: 'Open Oakwood Estates' })
    expect(screen.queryByText('Syncing…')).not.toBeInTheDocument()
    expect(screen.queryByText('Sync paused — check your connection.')).not.toBeInTheDocument()

    mockFetchRouter({
      'GET /api/me': { status: 200, body: testUser },
      'GET /api/gates': { status: 500, body: {} },
    })
    window.dispatchEvent(new Event('online'))

    expect(await screen.findByText('Sync paused — check your connection.')).toBeInTheDocument()
  })
})
