import { describe, expect, it } from 'vitest'
import { searchGates } from './searchGates'
import type { Gate } from './repository'

function makeGate(overrides: Partial<Gate> & { name: string }): Gate {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    code: '0000',
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

describe('searchGates', () => {
  it('matches a case-insensitive substring', () => {
    const oakwood = makeGate({ name: 'Oakwood Estates' })
    const cedar = makeGate({ name: 'Cedar Ridge' })

    expect(searchGates([oakwood, cedar], 'oakwood estates')).toEqual([oakwood])
  })

  it('matches a partial substring anywhere in the name', () => {
    const oakwood = makeGate({ name: 'Oakwood Estates' })

    expect(searchGates([oakwood], 'wood')).toEqual([oakwood])
  })

  it('returns nothing for a query that matches no gate', () => {
    const oakwood = makeGate({ name: 'Oakwood Estates' })

    expect(searchGates([oakwood], 'Cedar')).toEqual([])
  })

  it('returns nothing for an empty or whitespace-only query', () => {
    const oakwood = makeGate({ name: 'Oakwood Estates' })

    expect(searchGates([oakwood], '')).toEqual([])
    expect(searchGates([oakwood], '   ')).toEqual([])
  })

  it('can match more than one gate', () => {
    const oakwood = makeGate({ name: 'Oakwood Estates' })
    const oakHill = makeGate({ name: 'Oak Hill' })
    const cedar = makeGate({ name: 'Cedar Ridge' })

    expect(searchGates([oakwood, oakHill, cedar], 'oak')).toEqual([oakwood, oakHill])
  })
})
