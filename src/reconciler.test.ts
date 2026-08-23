import { describe, expect, it } from 'vitest'
import { reconcile } from './reconciler'
import type { Gate } from './repository'

function makeGate(overrides: Partial<Gate> & { id: string; updatedAt: string }): Gate {
  return {
    name: 'Oakwood Estates',
    code: '0451#',
    notes: '',
    lat: null,
    lng: null,
    accuracy: null,
    createdAt: overrides.updatedAt,
    deletedAt: null,
    codeHistory: [],
    failedAt: null,
    ...overrides,
  }
}

describe('reconcile', () => {
  it('pushes a gate that only exists locally', () => {
    const local = makeGate({ id: '1', updatedAt: '2026-01-01T00:00:00.000Z' })

    const result = reconcile([local], [])

    expect(result.toPush).toEqual([local])
    expect(result.toApplyLocally).toEqual([])
  })

  it('applies a gate that only exists remotely (e.g. local storage was wiped)', () => {
    const remote = makeGate({ id: '1', updatedAt: '2026-01-01T00:00:00.000Z' })

    const result = reconcile([], [remote])

    expect(result.toApplyLocally).toEqual([remote])
    expect(result.toPush).toEqual([])
  })

  it('remote-newer: applies the remote copy locally', () => {
    const local = makeGate({ id: '1', code: '1111', updatedAt: '2026-01-01T00:00:00.000Z' })
    const remote = makeGate({ id: '1', code: '2222', updatedAt: '2026-01-02T00:00:00.000Z' })

    const result = reconcile([local], [remote])

    expect(result.toApplyLocally).toEqual([remote])
    expect(result.toPush).toEqual([])
  })

  it('local-newer: pushes the local copy', () => {
    const local = makeGate({ id: '1', code: '2222', updatedAt: '2026-01-02T00:00:00.000Z' })
    const remote = makeGate({ id: '1', code: '1111', updatedAt: '2026-01-01T00:00:00.000Z' })

    const result = reconcile([local], [remote])

    expect(result.toPush).toEqual([local])
    expect(result.toApplyLocally).toEqual([])
  })

  it('flag-only local edit: a newer failedAt-only change still wins over remote', () => {
    const local = makeGate({
      id: '1',
      code: '1111',
      failedAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
    const remote = makeGate({
      id: '1',
      code: '1111',
      failedAt: null,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const result = reconcile([local], [remote])

    expect(result.toPush).toEqual([local])
    expect(result.toApplyLocally).toEqual([])
  })

  it('identical updatedAt: already in sync, no action either direction', () => {
    const local = makeGate({ id: '1', updatedAt: '2026-01-01T00:00:00.000Z' })
    const remote = makeGate({ id: '1', updatedAt: '2026-01-01T00:00:00.000Z' })

    const result = reconcile([local], [remote])

    expect(result.toPush).toEqual([])
    expect(result.toApplyLocally).toEqual([])
  })

  it('both-deleted: resolves without error, newer tombstone wins', () => {
    const local = makeGate({
      id: '1',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: '2026-01-02T00:00:00.000Z',
    })
    const remote = makeGate({
      id: '1',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: '2026-01-01T00:00:00.000Z',
    })

    const result = reconcile([local], [remote])

    expect(result.toPush).toEqual([local])
    expect(result.toApplyLocally).toEqual([])
  })

  it('deleted-remotely-but-edited-locally, local edit newer: resurrects the gate remotely', () => {
    const remote = makeGate({
      id: '1',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: '2026-01-01T00:00:00.000Z',
    })
    const local = makeGate({
      id: '1',
      code: '9999',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
    })

    const result = reconcile([local], [remote])

    expect(result.toPush).toEqual([local])
    expect(result.toApplyLocally).toEqual([])
  })

  it('deleted-remotely-but-edited-locally, remote delete newer: the delete wins', () => {
    const local = makeGate({
      id: '1',
      code: '9999',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    })
    const remote = makeGate({
      id: '1',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: '2026-01-02T00:00:00.000Z',
    })

    const result = reconcile([local], [remote])

    expect(result.toApplyLocally).toEqual([remote])
    expect(result.toPush).toEqual([])
  })

  it('handles a mix of independent gates correctly in one pass', () => {
    const localOnly = makeGate({ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' })
    const remoteOnly = makeGate({ id: 'b', updatedAt: '2026-01-01T00:00:00.000Z' })
    const localNewer = makeGate({ id: 'c', updatedAt: '2026-01-02T00:00:00.000Z' })
    const remoteNewerOld = makeGate({ id: 'c', updatedAt: '2026-01-01T00:00:00.000Z' })
    const inSync = makeGate({ id: 'd', updatedAt: '2026-01-01T00:00:00.000Z' })

    const result = reconcile(
      [localOnly, localNewer, inSync],
      [remoteOnly, remoteNewerOld, inSync],
    )

    expect(result.toPush).toEqual([localOnly, localNewer])
    expect(result.toApplyLocally).toEqual([remoteOnly])
  })
})
