import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddGateSheet } from './AddGateSheet'

describe('AddGateSheet', () => {
  it('closes on the × button without adding', async () => {
    const onAdd = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<AddGateSheet onAdd={onAdd} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('closes on backdrop click', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<AddGateSheet onAdd={vi.fn()} onClose={onClose} />)

    await user.click(screen.getByRole('dialog', { name: 'Add a gate' }).parentElement!)

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on the Cancel button without adding', async () => {
    const onAdd = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<AddGateSheet onAdd={onAdd} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onAdd).not.toHaveBeenCalled()
  })
})
