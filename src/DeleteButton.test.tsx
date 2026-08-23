import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteButton } from './DeleteButton'

describe('DeleteButton', () => {
  it('does not call onConfirm on the first click — it only opens the dialog', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <DeleteButton
        label="Delete gate"
        title="Delete this gate?"
        description="This can't be undone."
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog', { name: 'Delete this gate?' })).toBeInTheDocument()
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument()
  })

  it('calls onConfirm when Confirm is clicked', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <DeleteButton
        label="Delete gate"
        title="Delete this gate?"
        description="This can't be undone."
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('cancel closes the dialog without calling onConfirm', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <DeleteButton
        label="Delete gate"
        title="Delete this gate?"
        description="This can't be undone."
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('renders an icon-only trigger for the icon variant, still labeled for accessibility', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <DeleteButton
        label="Delete address"
        title="Remove this address?"
        description="The gate and its code stay saved."
        trigger="icon"
        onConfirm={onConfirm}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Delete address' })
    expect(trigger).toBeInTheDocument()
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('notifies onArmedChange when opening and closing the dialog', async () => {
    const onArmedChange = vi.fn()
    const user = userEvent.setup()
    render(
      <DeleteButton
        label="Delete gate"
        title="Delete this gate?"
        description="This can't be undone."
        onConfirm={vi.fn()}
        onArmedChange={onArmedChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))
    expect(onArmedChange).toHaveBeenLastCalledWith(true)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onArmedChange).toHaveBeenLastCalledWith(false)
  })

  it('closes on backdrop click without confirming', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <DeleteButton
        label="Delete gate"
        title="Delete this gate?"
        description="This can't be undone."
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))
    await user.click(screen.getByRole('alertdialog', { name: 'Delete this gate?' }).parentElement!)

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('closes on Escape without confirming', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <DeleteButton
        label="Delete gate"
        title="Delete this gate?"
        description="This can't be undone."
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))
    await user.keyboard('{Escape}')

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
