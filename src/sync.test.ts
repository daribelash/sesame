import { afterEach, describe, expect, it, vi } from 'vitest'
import { syncGates } from './sync'
import type { Gate, GateRepository } from './repository'

afterEach(() => {
  vi.unstubAllGlobals()
})

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
    ...overrides,
  }
}

function fakeRepo(local: Gate[]): GateRepository & { applied: Gate[] } {
  const applied: Gate[] = []
  return {
    listGates: () => local,
    createGate: vi.fn(),
    updateGate: vi.fn(),
    deleteGate: vi.fn(),
    exportGates: () => local,
    importGates: vi.fn(),
    applyRemoteGates: (gates) => applied.push(...gates),
    applied,
  }
}

describe('syncGates', () => {
  it('pulls remote-newer gates locally and pushes local-newer gates', async () => {
    const localOnly = makeGate({ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' })
    const remoteOnly = makeGate({ id: 'b', updatedAt: '2026-01-01T00:00:00.000Z' })
    const repo = fakeRepo([localOnly])

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === undefined) {
        return { ok: true, json: () => Promise.resolve([remoteOnly]) }
      }
      return { ok: true, json: () => Promise.resolve({ ok: true }) }
    })
    vi.stubGlobal('fetch', fetchMock)

    await syncGates(repo)

    expect(repo.applied).toEqual([remoteOnly])
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/gates',
      expect.objectContaining({ method: 'POST', body: JSON.stringify([localOnly]) }),
    )
  })

  it('does not push when there is nothing local-newer', async () => {
    const repo = fakeRepo([])
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await syncGates(repo)

    expect(fetchMock).toHaveBeenCalledTimes(1) // only the pull, no push
  })

  it('throws when the pull fails, so the caller can surface a status', async () => {
    const repo = fakeRepo([])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    await expect(syncGates(repo)).rejects.toThrow('Failed to pull gates from the server')
  })

  it('throws when the push fails', async () => {
    const local = makeGate({ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' })
    const repo = fakeRepo([local])
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: false })
    vi.stubGlobal('fetch', fetchMock)

    await expect(syncGates(repo)).rejects.toThrow('Failed to push gates to the server')
  })
})
