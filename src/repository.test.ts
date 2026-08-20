import { beforeEach, describe, expect, it } from 'vitest'
import { createGateRepository } from './repository'

const userId = 'user-1'

beforeEach(() => {
  localStorage.clear()
})

describe('createGate', () => {
  it('persists a gate with a generated id and timestamps', () => {
    const repo = createGateRepository(userId)
    const gate = repo.createGate({ name: 'Oakwood Estates', code: '0451#', notes: 'main gate' })

    expect(gate.id).toBeTruthy()
    expect(gate.name).toBe('Oakwood Estates')
    expect(gate.code).toBe('0451#')
    expect(gate.notes).toBe('main gate')
    expect(gate.deletedAt).toBeNull()
    expect(gate.createdAt).toBe(gate.updatedAt)

    expect(repo.listGates()).toEqual([gate])
  })

  it('stores the GPS fix when one is provided', () => {
    const repo = createGateRepository(userId)
    const gate = repo.createGate({
      name: 'Oakwood Estates',
      code: '0451#',
      notes: '',
      lat: 32.7767,
      lng: -96.797,
      accuracy: 12,
    })

    expect(gate.lat).toBe(32.7767)
    expect(gate.lng).toBe(-96.797)
    expect(gate.accuracy).toBe(12)
  })

  it('defaults lat, lng, and accuracy to null when no fix is provided', () => {
    const repo = createGateRepository(userId)
    const gate = repo.createGate({ name: 'Oakwood Estates', code: '0451#', notes: '' })

    expect(gate.lat).toBeNull()
    expect(gate.lng).toBeNull()
    expect(gate.accuracy).toBeNull()
  })

  it('gives each gate a distinct id', () => {
    const repo = createGateRepository(userId)
    const first = repo.createGate({ name: 'Gate A', code: '1111', notes: '' })
    const second = repo.createGate({ name: 'Gate B', code: '2222', notes: '' })

    expect(first.id).not.toBe(second.id)
  })
})

describe('reading legacy data', () => {
  it('normalizes gates saved before codeHistory existed, rather than crashing', () => {
    localStorage.setItem(
      `sesame:gates:${userId}`,
      JSON.stringify([
        {
          id: '1',
          name: 'Riverbend',
          code: '7788',
          notes: '',
          lat: null,
          lng: null,
          accuracy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          // no codeHistory field — this is what pre-sprint-8 data looks like
        },
      ]),
    )

    const gates = createGateRepository(userId).listGates()

    expect(gates[0].codeHistory).toEqual([])
  })
})

describe('listGates', () => {
  it('returns an empty list when nothing has been saved', () => {
    expect(createGateRepository(userId).listGates()).toEqual([])
  })

  it('survives a reload by reading from localStorage', () => {
    createGateRepository(userId).createGate({ name: 'Oakwood Estates', code: '0451#', notes: '' })

    // A "reload" is just a fresh read from the same backing store.
    expect(createGateRepository(userId).listGates()).toHaveLength(1)
  })
})

describe('updateGate', () => {
  it('applies changes and bumps updatedAt', async () => {
    const repo = createGateRepository(userId)
    const gate = repo.createGate({ name: 'Oakwood Estates', code: '0451', notes: '' })

    await new Promise((resolve) => setTimeout(resolve, 2))
    const updated = repo.updateGate(gate.id, { code: '0452' })

    expect(updated?.code).toBe('0452')
    expect(updated?.name).toBe('Oakwood Estates')
    expect(updated?.updatedAt).not.toBe(gate.updatedAt)
    expect(repo.listGates()[0].code).toBe('0452')
  })

  it('returns undefined for an id that does not exist', () => {
    expect(createGateRepository(userId).updateGate('missing-id', { code: '9999' })).toBeUndefined()
  })

  it('records the superseded code in history when the code changes', () => {
    const repo = createGateRepository(userId)
    const gate = repo.createGate({ name: 'Oakwood Estates', code: '0451#', notes: '' })

    const updated = repo.updateGate(gate.id, { code: '9999' })

    expect(updated?.code).toBe('9999')
    expect(updated?.codeHistory).toHaveLength(1)
    expect(updated?.codeHistory[0].code).toBe('0451#')
    expect(updated?.codeHistory[0].supersededAt).toBe(updated?.updatedAt)
  })

  it('accumulates history newest-first across multiple code changes', () => {
    const repo = createGateRepository(userId)
    const gate = repo.createGate({ name: 'Oakwood Estates', code: '1111', notes: '' })

    repo.updateGate(gate.id, { code: '2222' })
    const final = repo.updateGate(gate.id, { code: '3333' })

    expect(final?.code).toBe('3333')
    expect(final?.codeHistory.map((entry) => entry.code)).toEqual(['2222', '1111'])
  })

  it('does not record history when the code is unchanged', () => {
    const repo = createGateRepository(userId)
    const gate = repo.createGate({ name: 'Oakwood Estates', code: '0451#', notes: '' })

    const updated = repo.updateGate(gate.id, { name: 'New name, same code' })

    expect(updated?.code).toBe('0451#')
    expect(updated?.codeHistory).toEqual([])
  })
})

describe('deleteGate', () => {
  it('soft-deletes a gate so it stops appearing in reads', () => {
    const repo = createGateRepository(userId)
    const gate = repo.createGate({ name: 'Oakwood Estates', code: '0451', notes: '' })

    repo.deleteGate(gate.id)

    expect(repo.listGates()).toEqual([])
  })

  it('is a no-op for an id that does not exist', () => {
    expect(() => createGateRepository(userId).deleteGate('missing-id')).not.toThrow()
  })
})

describe('exportGates', () => {
  it('includes soft-deleted tombstones, unlike listGates', () => {
    const repo = createGateRepository(userId)
    const active = repo.createGate({
      name: 'Oakwood Estates',
      code: '0451#',
      notes: '',
      lat: 32.1,
      lng: -96.1,
      accuracy: 10,
    })
    const toDelete = repo.createGate({ name: 'Old Gate', code: '9999', notes: '' })
    repo.deleteGate(toDelete.id)

    expect(repo.listGates()).toEqual([active])
    expect(repo.exportGates().map((gate) => gate.id)).toEqual(
      expect.arrayContaining([active.id, toDelete.id]),
    )
  })
})

describe('applyRemoteGates', () => {
  it('upserts without touching gates the server did not send', () => {
    const repo = createGateRepository(userId)
    const untouched = repo.createGate({ name: 'Untouched', code: '0000', notes: '' })
    const existing = repo.createGate({ name: 'Old name', code: '1111', notes: '' })

    const updatedFromServer = { ...existing, name: 'New name from server' }
    repo.applyRemoteGates([updatedFromServer])

    const gates = repo.listGates()
    expect(gates.find((g) => g.id === existing.id)?.name).toBe('New name from server')
    expect(gates.find((g) => g.id === untouched.id)?.name).toBe('Untouched')
  })

  it('adds gates that only existed remotely', () => {
    const repo = createGateRepository(userId)
    const fromServer = {
      id: 'remote-1',
      name: 'From server',
      code: '2222',
      notes: '',
      lat: null,
      lng: null,
      accuracy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      codeHistory: [],
    }

    repo.applyRemoteGates([fromServer])

    expect(repo.listGates()).toEqual([fromServer])
  })
})

describe('per-user isolation', () => {
  it('never shows one account gates to another', () => {
    const repoA = createGateRepository('user-a')
    const repoB = createGateRepository('user-b')

    repoA.createGate({ name: "A's gate", code: '1111', notes: '' })

    expect(repoA.listGates()).toHaveLength(1)
    expect(repoB.listGates()).toEqual([])
  })
})
