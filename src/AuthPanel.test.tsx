import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthPanel } from './AuthPanel'

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('AuthPanel', () => {
  it('logs in and reports the authenticated user and mode', async () => {
    const fetchMock = mockFetchOnce(200, { id: '1', email: 'driver@example.com' })
    const onAuthenticated = vi.fn()
    const user = userEvent.setup()
    render(<AuthPanel onAuthenticated={onAuthenticated} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Email'), 'driver@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/login',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(onAuthenticated).toHaveBeenCalledWith({ id: '1', email: 'driver@example.com' }, 'login')
  })

  it('switches to register mode and submits to the register endpoint', async () => {
    const fetchMock = mockFetchOnce(201, { id: '2', email: 'new@example.com' })
    const onAuthenticated = vi.fn()
    const user = userEvent.setup()
    render(<AuthPanel onAuthenticated={onAuthenticated} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Need an account? Register' }))
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/register',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(onAuthenticated).toHaveBeenCalledWith(
      { id: '2', email: 'new@example.com' },
      'register',
    )
  })

  it('starts in register mode with a step label when initialMode is register', () => {
    render(<AuthPanel initialMode="register" onAuthenticated={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('shows no step label in login mode', () => {
    render(<AuthPanel initialMode="login" onAuthenticated={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.queryByText('Step 1 of 3')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows an error message and does not authenticate on a server rejection', async () => {
    mockFetchOnce(401, { error: 'Invalid email or password' })
    const onAuthenticated = vi.fn()
    const user = userEvent.setup()
    render(<AuthPanel onAuthenticated={onAuthenticated} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Email'), 'driver@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(onAuthenticated).not.toHaveBeenCalled()
  })

  it('rejects an empty email or password before hitting the network', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<AuthPanel onAuthenticated={vi.fn()} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter both an email and a password.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed email before hitting the network', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<AuthPanel onAuthenticated={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByRole('alert')).toHaveTextContent("That email address doesn't look right.")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a short password on register before hitting the network', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<AuthPanel initialMode="register" onAuthenticated={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 8 characters.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('calls onCancel when Back is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<AuthPanel onAuthenticated={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: '← Back' }))

    expect(onCancel).toHaveBeenCalled()
  })
})
