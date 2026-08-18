import { beforeEach, describe, expect, it } from 'vitest'
import { createGate, deleteGate, exportGates, importGates, listGates, updateGate } from './repository'

beforeEach(() => {
  localStorage.clear()
})

describe('createGate', () => {
  it('persists a gate with a generated id and timestamps', () => {
    const gate = createGate({ name: 'Oakwood Estates', code: '0451#', notes: 'main gate' })

    expect(gate.id).toBeTruthy()
    expect(gate.name).toBe('Oakwood Estates')
    expect(gate.code).toBe('0451#')
    expect(gate.notes).toBe('main gate')
    expect(gate.deletedAt).toBeNull()
    expect(gate.createdAt).toBe(gate.updatedAt)

    expect(listGates()).toEqual([gate])
  })

  it('stores the GPS fix when one is provided', () => {
    const gate = createGate({
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
    const gate = createGate({ name: 'Oakwood Estates', code: '0451#', notes: '' })

    expect(gate.lat).toBeNull()
    expect(gate.lng).toBeNull()
    expect(gate.accuracy).toBeNull()
  })

  it('gives each gate a distinct id', () => {
    const first = createGate({ name: 'Gate A', code: '1111', notes: '' })
    const second = createGate({ name: 'Gate B', code: '2222', notes: '' })

    expect(first.id).not.toBe(second.id)
  })
})

describe('listGates', () => {
  it('returns an empty list when nothing has been saved', () => {
    expect(listGates()).toEqual([])
  })

  it('survives a reload by reading from localStorage', () => {
    createGate({ name: 'Oakwood Estates', code: '0451#', notes: '' })

    // A "reload" is just a fresh read from the same backing store.
    expect(listGates()).toHaveLength(1)
  })
})

describe('updateGate', () => {
  it('applies changes and bumps updatedAt', async () => {
    const gate = createGate({ name: 'Oakwood Estates', code: '0451', notes: '' })

    await new Promise((resolve) => setTimeout(resolve, 2))
    const updated = updateGate(gate.id, { code: '0452' })

    expect(updated?.code).toBe('0452')
    expect(updated?.name).toBe('Oakwood Estates')
    expect(updated?.updatedAt).not.toBe(gate.updatedAt)
    expect(listGates()[0].code).toBe('0452')
  })

  it('returns undefined for an id that does not exist', () => {
    expect(updateGate('missing-id', { code: '9999' })).toBeUndefined()
  })
})

describe('deleteGate', () => {
  it('soft-deletes a gate so it stops appearing in reads', () => {
    const gate = createGate({ name: 'Oakwood Estates', code: '0451', notes: '' })

    deleteGate(gate.id)

    expect(listGates()).toEqual([])
  })

  it('is a no-op for an id that does not exist', () => {
    expect(() => deleteGate('missing-id')).not.toThrow()
  })
})

describe('exportGates/importGates', () => {
  it('round-trips all gates, including soft-deleted tombstones, without data loss', () => {
    const active = createGate({
      name: 'Oakwood Estates',
      code: '0451#',
      notes: '',
      lat: 32.1,
      lng: -96.1,
      accuracy: 10,
    })
    const toDelete = createGate({ name: 'Old Gate', code: '9999', notes: '' })
    deleteGate(toDelete.id)

    const exported = exportGates()
    expect(exported).toHaveLength(2)

    localStorage.clear()
    expect(listGates()).toEqual([])

    importGates(exported)

    expect(listGates()).toEqual([active])
    expect(exportGates()).toEqual(exported)
  })

  it('replaces the existing store rather than merging into it', () => {
    createGate({ name: 'Will be replaced', code: '0000', notes: '' })
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

    importGates(incoming)

    expect(listGates()).toEqual(incoming)
  })
})
