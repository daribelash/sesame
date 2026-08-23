import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SplashScreen } from './SplashScreen'

describe('SplashScreen', () => {
  it('calls onGetStarted when "Get started" is clicked', async () => {
    const onGetStarted = vi.fn()
    const user = userEvent.setup()
    render(<SplashScreen onGetStarted={onGetStarted} onLogIn={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Get started' }))

    expect(onGetStarted).toHaveBeenCalledOnce()
  })

  it('calls onLogIn when "I already have an account" is clicked', async () => {
    const onLogIn = vi.fn()
    const user = userEvent.setup()
    render(<SplashScreen onGetStarted={vi.fn()} onLogIn={onLogIn} />)

    await user.click(screen.getByRole('button', { name: 'I already have an account' }))

    expect(onLogIn).toHaveBeenCalledOnce()
  })
})
