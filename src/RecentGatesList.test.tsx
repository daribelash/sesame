import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentGatesList } from './RecentGatesList'
import type { GateWithDistance } from './gateSort'

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
    const { container } = render(<RecentGatesList title="Nearby" gates={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders name, code, and distance for each gate', () => {
    const gates = [makeGate({ id: 'g1', name: 'Oakwood Estates', distanceMiles: 1.2 })]
    render(<RecentGatesList title="Nearby" gates={gates} />)

    expect(screen.getByText('Nearby')).toBeInTheDocument()
    expect(screen.getByText('Oakwood Estates')).toBeInTheDocument()
    expect(screen.getByText('0451#')).toBeInTheDocument()
    expect(screen.getByText('1.2 mi')).toBeInTheDocument()
  })

  it('shows the created-at date only when showCreatedAt is set', () => {
    const gates = [makeGate({ id: 'g1', createdAt: '2026-01-05T12:00:00.000Z' })]
    const { rerender } = render(<RecentGatesList title="Recently added" gates={gates} />)
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument()

    rerender(<RecentGatesList title="Recently added" gates={gates} showCreatedAt />)
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })
})
