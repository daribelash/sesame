import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

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
 * empty remote gate list unless overridden. */
function mockLoggedIn(remoteGates: unknown[] = []) {
  return mockFetchRouter({
    'GET /api/me': { status: 200, body: testUser },
    'GET /api/gates': { status: 200, body: remoteGates },
    'POST /api/gates': { status: 200, body: { ok: true } },
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

    await user.type(await screen.findByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.type(screen.getByLabelText('Notes'), 'call box on the right')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    expect(
      await screen.findByRole('heading', { name: 'Oakwood Estates' }),
    ).toBeInTheDocument()
    expect(screen.getByText('0451#')).toBeInTheDocument()
    expect(screen.getByText('call box on the right')).toBeInTheDocument()
  })

  it('clears the form after a successful submit', async () => {
    mockLoggedIn()
    const user = userEvent.setup()
    render(<App />)

    await user.type(await screen.findByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    await screen.findByRole('heading', { name: 'Oakwood Estates' })
    expect(screen.getByLabelText('Gate name')).toHaveValue('')
    expect(screen.getByLabelText('Code')).toHaveValue('')
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

    await user.type(await screen.findByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    expect(
      await screen.findByRole('heading', { name: 'Oakwood Estates' }),
    ).toBeInTheDocument()
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
        },
      ]),
    )

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Riverbend' })).toBeInTheDocument()
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
        },
      ]),
    )
    mockLoggedIn()

    render(<App />)

    await screen.findByLabelText('Gate name')
    expect(screen.queryByText("Someone else's gate")).not.toBeInTheDocument()
  })

  it('prompts to log in instead of showing the gate form when logged out', async () => {
    mockFetchRouter({ 'GET /api/me': { status: 401, body: { error: 'Unauthorized' } } })

    render(<App />)

    expect(await screen.findByText('Log in to see your saved gates.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Gate name')).not.toBeInTheDocument()
  })

  it('shows the account bar after logging in, and the prompt again after logging out', async () => {
    mockFetchRouter({
      'GET /api/me': { status: 401, body: { error: 'Unauthorized' } },
      'POST /api/login': { status: 200, body: testUser },
      'POST /api/logout': { status: 204, body: null },
    })

    const user = userEvent.setup()
    render(<App />)

    // Auth is a separate screen, not stacked on the gate list.
    await user.click(await screen.findByRole('button', { name: 'Log in' }))
    await user.type(screen.getByLabelText('Email'), testUser.email)
    await user.type(screen.getByLabelText('Password'), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText(`Logged in as ${testUser.email}`)).toBeInTheDocument()
    expect(screen.getByLabelText('Gate name')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByText('Log in to see your saved gates.')).toBeInTheDocument()
  })

  it('stays logged in offline using the cached identity, even when /api/me is unreachable', async () => {
    localStorage.setItem('sesame:user', JSON.stringify(testUser))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    render(<App />)

    expect(await screen.findByLabelText('Gate name')).toBeInTheDocument()
    expect(screen.queryByText('Log in to see your saved gates.')).not.toBeInTheDocument()
  })

  it('returns to the logged-out prompt without logging in when Back is clicked', async () => {
    mockFetchRouter({ 'GET /api/me': { status: 401, body: { error: 'Unauthorized' } } })

    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Log in' }))
    expect(screen.getByLabelText('Email')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '← Back' }))

    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(screen.getByText('Log in to see your saved gates.')).toBeInTheDocument()
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
    }
    mockLoggedIn([remoteGate])

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Riverbend' })).toBeInTheDocument()
  })

  it('shows a quiet status while syncing, and an error note when it fails', async () => {
    mockLoggedIn()
    const user = userEvent.setup()
    render(<App />)

    await user.type(await screen.findByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    // The add re-triggers a sync; it resolves against the same mock, so the
    // app settles back to no visible status rather than staying stuck.
    await screen.findByRole('heading', { name: 'Oakwood Estates' })
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
