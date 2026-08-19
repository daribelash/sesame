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
  it('logs in and reports the authenticated user', async () => {
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
    expect(onAuthenticated).toHaveBeenCalledWith({ id: '1', email: 'driver@example.com' })
  })

  it('switches to register mode and submits to the register endpoint', async () => {
    const fetchMock = mockFetchOnce(201, { id: '2', email: 'new@example.com' })
    const onAuthenticated = vi.fn()
    const user = userEvent.setup()
    render(<AuthPanel onAuthenticated={onAuthenticated} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Need an account? Register' }))
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/register',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(onAuthenticated).toHaveBeenCalledWith({ id: '2', email: 'new@example.com' })
  })

  it('shows an error message and does not authenticate on failure', async () => {
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

  it('calls onCancel when Back is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<AuthPanel onAuthenticated={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: '← Back' }))

    expect(onCancel).toHaveBeenCalled()
  })
})
