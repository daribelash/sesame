import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GateSearch } from './GateSearch'
import type { Gate } from './repository'
import type { Address } from './addressRepository'

const noop = () => {}

function makeGate(overrides: Partial<Gate> & { id: string; name: string }): Gate {
  const now = new Date().toISOString()
  return {
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
    ...overrides,
  }
}

function makeAddress(overrides: Partial<Address> & { gateId: string; address: string }): Address {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    notes: '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

describe('GateSearch', () => {
  it('shows matching gates under a "Gates" group', async () => {
    const gates = [makeGate({ id: 'g1', name: 'Oakwood Estates' })]
    const user = userEvent.setup()
    render(<GateSearch gates={gates} addresses={[]} onOpenGate={noop} />)

    await user.type(screen.getByLabelText('Search by gate name or address'), 'Oakwood')

    const group = within(screen.getByText('Gates').closest('.search-group')!)
    expect(group.getByRole('heading', { level: 3, name: 'Oakwood Estates' })).toBeInTheDocument()
    expect(group.getByText('0451#')).toBeInTheDocument()
  })

  it('shows matching addresses under an "Addresses" group', async () => {
    const gates = [makeGate({ id: 'g1', name: 'Oakwood Estates' })]
    const addresses = [makeAddress({ gateId: 'g1', address: '123 Oak Lane' })]
    const user = userEvent.setup()
    render(<GateSearch gates={gates} addresses={addresses} onOpenGate={noop} />)

    await user.type(screen.getByLabelText('Search by gate name or address'), 'Oak Lane')

    const group = within(screen.getByText('Addresses').closest('.search-group')!)
    expect(group.getByRole('heading', { level: 3, name: 'Oakwood Estates' })).toBeInTheDocument()
    expect(group.getByText('123 Oak Lane')).toBeInTheDocument()
  })

  it('shows "No matches" when neither gates nor addresses match', async () => {
    const gates = [makeGate({ id: 'g1', name: 'Oakwood Estates' })]
    const user = userEvent.setup()
    render(<GateSearch gates={gates} addresses={[]} onOpenGate={noop} />)

    await user.type(screen.getByLabelText('Search by gate name or address'), 'Nonexistent')

    expect(screen.getByText('No matches.')).toBeInTheDocument()
  })

  it('shows nothing when the query is empty', () => {
    const gates = [makeGate({ id: 'g1', name: 'Oakwood Estates' })]
    render(<GateSearch gates={gates} addresses={[]} onOpenGate={noop} />)

    expect(screen.queryByText('Gates')).not.toBeInTheDocument()
    expect(screen.queryByText('No matches.')).not.toBeInTheDocument()
  })

  it('opens the gate when a "Gates" result is clicked', async () => {
    const gates = [makeGate({ id: 'g1', name: 'Oakwood Estates' })]
    const onOpenGate = vi.fn()
    const user = userEvent.setup()
    render(<GateSearch gates={gates} addresses={[]} onOpenGate={onOpenGate} />)

    await user.type(screen.getByLabelText('Search by gate name or address'), 'Oakwood')
    await user.click(screen.getByRole('button', { name: 'Open Oakwood Estates' }))

    expect(onOpenGate).toHaveBeenCalledWith('g1')
  })

  it('opens the associated gate when an "Addresses" result is clicked', async () => {
    const gates = [makeGate({ id: 'g1', name: 'Oakwood Estates' })]
    const addresses = [makeAddress({ gateId: 'g1', address: '123 Oak Lane' })]
    const onOpenGate = vi.fn()
    const user = userEvent.setup()
    render(<GateSearch gates={gates} addresses={addresses} onOpenGate={onOpenGate} />)

    await user.type(screen.getByLabelText('Search by gate name or address'), 'Oak Lane')
    await user.click(screen.getByRole('button', { name: 'Open Oakwood Estates' }))

    expect(onOpenGate).toHaveBeenCalledWith('g1')
  })
})
