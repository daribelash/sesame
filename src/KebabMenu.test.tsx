import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KebabMenu } from './KebabMenu'

vi.mock('./auth', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
}))

describe('KebabMenu', () => {
  it('hides the dropdown until the button is clicked', () => {
    render(<KebabMenu onLoggedOut={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
  })

  it('opens the dropdown on click, revealing Log out', async () => {
    const user = userEvent.setup()
    render(<KebabMenu onLoggedOut={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Account menu' }))

    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('calls onLoggedOut after logging out', async () => {
    const onLoggedOut = vi.fn()
    const user = userEvent.setup()
    render(<KebabMenu onLoggedOut={onLoggedOut} />)

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(onLoggedOut).toHaveBeenCalledOnce()
  })
})
