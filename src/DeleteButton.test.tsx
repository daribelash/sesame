import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteButton } from './DeleteButton'

describe('DeleteButton', () => {
  it('does not call onConfirm on the first click — it only arms', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<DeleteButton label="Delete gate" onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument()
  })

  it('calls onConfirm on the second click', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<DeleteButton label="Delete gate" onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('cancel disarms without calling onConfirm', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<DeleteButton label="Delete gate" onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Delete gate' })).toBeInTheDocument()
  })

  it('renders an icon-only trigger for the icon variant, still labeled for accessibility', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<DeleteButton label="Delete address" onConfirm={onConfirm} variant="icon" />)

    const trigger = screen.getByRole('button', { name: 'Delete address' })
    expect(trigger).toBeInTheDocument()
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('notifies onArmedChange when arming and disarming', async () => {
    const onArmedChange = vi.fn()
    const user = userEvent.setup()
    render(<DeleteButton label="Delete gate" onConfirm={vi.fn()} onArmedChange={onArmedChange} />)

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))
    expect(onArmedChange).toHaveBeenLastCalledWith(true)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onArmedChange).toHaveBeenLastCalledWith(false)
  })
})
