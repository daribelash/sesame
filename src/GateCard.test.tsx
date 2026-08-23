import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GateCard } from './GateCard'
import type { GateWithDistance } from './gateSort'

function makeGate(overrides: Partial<GateWithDistance> = {}): GateWithDistance {
  return {
    id: 'gate-1',
    name: 'Oakwood Estates',
    code: '0451#',
    notes: '',
    lat: null,
    lng: null,
    accuracy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    codeHistory: [],
    failedAt: null,
    distanceMiles: null,
    ...overrides,
  }
}

describe('GateCard', () => {
  it('shows name and code, and no failed badge when not flagged', () => {
    render(<GateCard gate={makeGate()} addressCount={2} onOpenDetail={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Oakwood Estates' })).toBeInTheDocument()
    expect(screen.getByText('0451#')).toBeInTheDocument()
    expect(screen.getByText(/2 addresses · updated/)).toBeInTheDocument()
    expect(screen.queryByText(/Reported not working/)).not.toBeInTheDocument()
  })

  it('shows a failed badge when the gate is flagged', () => {
    render(
      <GateCard
        gate={makeGate({ failedAt: new Date().toISOString() })}
        addressCount={0}
        onOpenDetail={vi.fn()}
      />,
    )

    expect(screen.getByText(/Reported not working/)).toBeInTheDocument()
  })

  it('calls onOpenDetail with the gate id when clicked', async () => {
    const onOpenDetail = vi.fn()
    const user = userEvent.setup()
    render(<GateCard gate={makeGate()} addressCount={0} onOpenDetail={onOpenDetail} />)

    await user.click(screen.getByRole('button', { name: 'Open Oakwood Estates' }))

    expect(onOpenDetail).toHaveBeenCalledWith('gate-1')
  })
})
