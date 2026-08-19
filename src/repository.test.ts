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

describe('exportGates/importGates', () => {
  it('round-trips all gates, including soft-deleted tombstones, without data loss', () => {
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

    const exported = repo.exportGates()
    expect(exported).toHaveLength(2)

    localStorage.clear()
    expect(repo.listGates()).toEqual([])

    repo.importGates(exported)

    expect(repo.listGates()).toEqual([active])
    expect(repo.exportGates()).toEqual(exported)
  })

  it('replaces the existing store rather than merging into it', () => {
    const repo = createGateRepository(userId)
    repo.createGate({ name: 'Will be replaced', code: '0000', notes: '' })
    const incoming = [
      {
        id: 'imported-1',
        name: 'From backup',
        code: '1111',
        notes: '',
        lat: null,
        lng: null,
        accuracy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
    ]

    repo.importGates(incoming)

    expect(repo.listGates()).toEqual(incoming)
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
