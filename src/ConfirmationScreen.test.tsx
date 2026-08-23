import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmationScreen } from './ConfirmationScreen'

describe('ConfirmationScreen', () => {
  it('shows the saved-gate summary card for the "saved" variant', () => {
    render(
      <ConfirmationScreen
        variant="saved"
        gate={{ name: 'Oakwood Estates', code: '0451#' }}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: "You're all set." })).toBeInTheDocument()
    expect(screen.getByText('Oakwood Estates')).toBeInTheDocument()
    expect(screen.getByText('0451#')).toBeInTheDocument()
  })

  it('shows lighter copy and no summary card for the "skipped" variant', () => {
    render(<ConfirmationScreen variant="skipped" gate={null} onContinue={vi.fn()} />)

    expect(screen.getByRole('heading', { name: "You're all set." })).toBeInTheDocument()
    expect(screen.getByText("Add a gate whenever you're ready.")).toBeInTheDocument()
    expect(screen.queryByText('0451#')).not.toBeInTheDocument()
  })

  it('shows welcome-back copy for the "welcome-back" variant', () => {
    render(<ConfirmationScreen variant="welcome-back" onContinue={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument()
  })

  it('calls onContinue when "Enter Sesame" is clicked', async () => {
    const onContinue = vi.fn()
    const user = userEvent.setup()
    render(<ConfirmationScreen variant="welcome-back" onContinue={onContinue} />)

    await user.click(screen.getByRole('button', { name: 'Enter Sesame' }))

    expect(onContinue).toHaveBeenCalledOnce()
  })
})
