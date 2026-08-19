import { describe, expect, it } from 'vitest'
import { searchAddresses } from './searchAddresses'
import type { Address } from './addressRepository'

function makeAddress(overrides: Partial<Address> & { address: string }): Address {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    gateId: 'gate-1',
    notes: '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

describe('searchAddresses', () => {
  it('matches a case-insensitive substring', () => {
    const oakLane = makeAddress({ address: '123 Oak Lane' })
    const elmSt = makeAddress({ address: '456 Elm St' })

    expect(searchAddresses([oakLane, elmSt], 'oak lane')).toEqual([oakLane])
  })

  it('matches a partial substring anywhere in the address', () => {
    const oakLane = makeAddress({ address: '123 Oak Lane' })

    expect(searchAddresses([oakLane], 'Oak')).toEqual([oakLane])
  })

  it('returns nothing for a query that matches no address', () => {
    const oakLane = makeAddress({ address: '123 Oak Lane' })

    expect(searchAddresses([oakLane], 'Maple')).toEqual([])
  })

  it('returns nothing for an empty or whitespace-only query', () => {
    const oakLane = makeAddress({ address: '123 Oak Lane' })

    expect(searchAddresses([oakLane], '')).toEqual([])
    expect(searchAddresses([oakLane], '   ')).toEqual([])
  })

  it('can match more than one address', () => {
    const oakLane = makeAddress({ address: '123 Oak Lane' })
    const oakStreet = makeAddress({ address: '789 Oak Street' })
    const elmSt = makeAddress({ address: '456 Elm St' })

    expect(searchAddresses([oakLane, oakStreet, elmSt], 'oak')).toEqual([oakLane, oakStreet])
  })
})
