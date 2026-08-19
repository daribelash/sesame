import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpdateCodeForm } from './UpdateCodeForm'

describe('UpdateCodeForm', () => {
  it('submits the new code', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<UpdateCodeForm currentCode="0451#" onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Change code' }))
    const input = screen.getByLabelText('New code')
    await user.clear(input)
    await user.type(input, '9999')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledWith('9999')
  })

  it('does not submit when cancelled', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<UpdateCodeForm currentCode="0451#" onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Change code' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Change code' })).toBeInTheDocument()
  })

  it('does not submit when the code is unchanged', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<UpdateCodeForm currentCode="0451#" onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Change code' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
