import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GateDetailSheet } from './GateDetailSheet'
import type { GateWithDistance } from './gateSort'
import type { Address } from './addressRepository'

function makeGate(overrides: Partial<GateWithDistance> = {}): GateWithDistance {
  return {
    id: 'gate-1',
    name: 'Oakwood Estates',
    code: '0451#',
    notes: 'call box on the right',
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

const noop = () => {}

describe('GateDetailSheet', () => {
  it('renders full gate detail', () => {
    render(
      <GateDetailSheet
        gate={makeGate()}
        addresses={[]}
        onClose={noop}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Oakwood Estates' })).toBeInTheDocument()
    expect(screen.getByText('0451#')).toBeInTheDocument()
    expect(screen.getByText('call box on the right')).toBeInTheDocument()
    expect(screen.getByText('No location recorded')).toBeInTheDocument()
    expect(screen.getByText(/0 addresses · updated/)).toBeInTheDocument()
  })

  it('checking the "code doesn\'t work" checkbox flags the gate', async () => {
    const onMarkCodeFailed = vi.fn()
    const user = userEvent.setup()
    render(
      <GateDetailSheet
        gate={makeGate()}
        addresses={[]}
        onClose={noop}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={onMarkCodeFailed}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Code not working' }))

    expect(onMarkCodeFailed).toHaveBeenCalledWith('gate-1')
  })

  it('shows the checkbox already checked once flagged', () => {
    render(
      <GateDetailSheet
        gate={makeGate({ failedAt: new Date().toISOString() })}
        addresses={[]}
        onClose={noop}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    const checkbox = screen.getByRole('checkbox', { name: 'Code not working' })
    expect(checkbox).toBeChecked()
    expect(screen.getByText('Reported not working')).toBeInTheDocument()
  })

  it('unchecking the checkbox clears the flag', async () => {
    const onClearCodeFailed = vi.fn()
    const user = userEvent.setup()
    render(
      <GateDetailSheet
        gate={makeGate({ failedAt: new Date().toISOString() })}
        addresses={[]}
        onClose={noop}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={onClearCodeFailed}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Code not working' }))

    expect(onClearCodeFailed).toHaveBeenCalledWith('gate-1')
  })

  it('does not show the flagged warning line when not flagged', () => {
    render(
      <GateDetailSheet
        gate={makeGate()}
        addresses={[]}
        onClose={noop}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    expect(screen.queryByText('Reported not working')).not.toBeInTheDocument()
  })

  it('closes on backdrop click and on the × button', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <GateDetailSheet
        gate={makeGate()}
        addresses={[]}
        onClose={onClose}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('deleting the gate calls onDeleteGate after confirming', async () => {
    const onDeleteGate = vi.fn()
    const user = userEvent.setup()
    render(
      <GateDetailSheet
        gate={makeGate()}
        addresses={[]}
        onClose={noop}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={onDeleteGate}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    expect(onDeleteGate).toHaveBeenCalledWith('gate-1')
  })

  it('deleting an address calls onDeleteAddress after confirming', async () => {
    const onDeleteAddress = vi.fn()
    const user = userEvent.setup()
    const address: Address = {
      id: 'addr-1',
      gateId: 'gate-1',
      address: '123 Oak Lane',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    }
    render(
      <GateDetailSheet
        gate={makeGate()}
        addresses={[address]}
        onClose={noop}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={onDeleteAddress}
        onUpdateLocation={noop}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete address' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    expect(onDeleteAddress).toHaveBeenCalledWith('addr-1')
  })

  it('opens an edit form pre-filled with name, code, and notes', async () => {
    const user = userEvent.setup()
    render(
      <GateDetailSheet
        gate={makeGate()}
        addresses={[]}
        onClose={noop}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByLabelText('Gate name')).toHaveValue('Oakwood Estates')
    expect(screen.getByLabelText('Code')).toHaveValue('0451#')
    expect(screen.getByLabelText('Notes')).toHaveValue('call box on the right')
  })

  it('saves edits and calls onUpdateGate with the new values', async () => {
    const onUpdateGate = vi.fn()
    const user = userEvent.setup()
    render(
      <GateDetailSheet
        gate={makeGate()}
        addresses={[]}
        onClose={noop}
        onUpdateGate={onUpdateGate}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const codeInput = screen.getByLabelText('Code')
    await user.clear(codeInput)
    await user.type(codeInput, '9999')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onUpdateGate).toHaveBeenCalledWith('gate-1', {
      name: 'Oakwood Estates',
      code: '9999',
      notes: 'call box on the right',
    })
    // Returns to the read view after saving.
    expect(screen.queryByLabelText('Code')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('cancels out of edit mode without saving', async () => {
    const onUpdateGate = vi.fn()
    const user = userEvent.setup()
    render(
      <GateDetailSheet
        gate={makeGate()}
        addresses={[]}
        onClose={noop}
        onUpdateGate={onUpdateGate}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onUpdateGate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('does not show raw coordinates for a located gate, only the adjust link', () => {
    render(
      <GateDetailSheet
        gate={makeGate({ lat: 30.5545, lng: -97.98896, accuracy: 5 })}
        addresses={[]}
        onClose={noop}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    expect(screen.queryByText(/30.5545/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adjust location on map' })).toBeInTheDocument()
  })

  it('shows only the first 3 addresses with a "See all" link when there are more', async () => {
    const now = new Date().toISOString()
    const addresses: Address[] = ['A', 'B', 'C', 'D'].map((label) => ({
      id: `addr-${label}`,
      gateId: 'gate-1',
      address: `${label} Oak Lane`,
      notes: '',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }))
    const user = userEvent.setup()
    render(
      <GateDetailSheet
        gate={makeGate()}
        addresses={addresses}
        onClose={noop}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    expect(screen.getByText('A Oak Lane')).toBeInTheDocument()
    expect(screen.queryByText('D Oak Lane')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'See all 4 addresses' }))

    expect(screen.getByText('D Oak Lane')).toBeInTheDocument()
  })

  it('hides Edit while a gate delete is armed', async () => {
    const user = userEvent.setup()
    render(
      <GateDetailSheet
        gate={makeGate()}
        addresses={[]}
        onClose={noop}
        onUpdateGate={noop}
        onAddAddress={noop}
        onMarkCodeFailed={noop}
        onClearCodeFailed={noop}
        onDeleteGate={noop}
        onDeleteAddress={noop}
        onUpdateLocation={noop}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete gate' }))

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
})
