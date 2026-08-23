import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecentGatesList } from './RecentGatesList'
import type { GateWithDistance } from './gateSort'

const noop = () => {}

function makeGate(overrides: Partial<GateWithDistance> & { id: string }): GateWithDistance {
  const now = new Date().toISOString()
  return {
    name: 'Oakwood Estates',
    code: '0451#',
    notes: '',
    lat: null,
    lng: null,
    accuracy: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    codeHistory: [],
    failedAt: null,
    distanceMiles: null,
    ...overrides,
  }
}

describe('RecentGatesList', () => {
  it('renders nothing when there are no gates', () => {
    const { container } = render(<RecentGatesList title="Nearby" gates={[]} onOpenDetail={noop} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders name, code, and distance for each gate', () => {
    const gates = [makeGate({ id: 'g1', name: 'Oakwood Estates', distanceMiles: 1.2 })]
    render(<RecentGatesList title="Nearby" gates={gates} onOpenDetail={noop} />)

    expect(screen.getByText('Nearby')).toBeInTheDocument()
    expect(screen.getByText('Oakwood Estates')).toBeInTheDocument()
    expect(screen.getByText('0451#')).toBeInTheDocument()
    expect(screen.getByText('1.2 mi')).toBeInTheDocument()
  })

  it('shows the created-at date only when showCreatedAt is set', () => {
    const gates = [makeGate({ id: 'g1', createdAt: '2026-01-05T12:00:00.000Z' })]
    const { rerender } = render(
      <RecentGatesList title="Recently added" gates={gates} onOpenDetail={noop} />,
    )
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument()

    rerender(<RecentGatesList title="Recently added" gates={gates} showCreatedAt onOpenDetail={noop} />)
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })

  it('opens the gate when a row is clicked', async () => {
    const gates = [makeGate({ id: 'g1', name: 'Oakwood Estates' })]
    const onOpenDetail = vi.fn()
    const user = userEvent.setup()
    render(<RecentGatesList title="Nearby" gates={gates} onOpenDetail={onOpenDetail} />)

    await user.click(screen.getByRole('button', { name: 'Open Oakwood Estates' }))

    expect(onOpenDetail).toHaveBeenCalledWith('g1')
  })

  it('renders the address count and heading-style name in the card variant', () => {
    const gates = [makeGate({ id: 'g1', name: 'Oakwood Estates', distanceMiles: 1.2 })]
    const addressesByGate = new Map([
      ['g1', [{ id: 'a1', gateId: 'g1', address: '1 Oak Ln', notes: '', createdAt: '', updatedAt: '', deletedAt: null }]],
    ])
    render(
      <RecentGatesList
        title="Nearby"
        gates={gates}
        onOpenDetail={noop}
        variant="card"
        addressesByGate={addressesByGate}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Oakwood Estates' })).toBeInTheDocument()
    expect(screen.getByText(/^1 address · updated/)).toBeInTheDocument()
  })
})
