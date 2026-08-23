import { describe, expect, it } from 'vitest'
import { selectClosestGates, selectRecentGates } from './gateSort'
import type { Gate } from './repository'

let idCounter = 0

function makeGate(overrides: Partial<Gate> = {}): Gate {
  idCounter += 1
  return {
    id: `gate-${idCounter}`,
    name: `Gate ${idCounter}`,
    code: '1234',
    notes: '',
    lat: null,
    lng: null,
    accuracy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    codeHistory: [],
    failedAt: null,
    ...overrides,
  }
}

// All along the same meridian, so distance is ~69 miles per degree of latitude.
const here = { lat: 32.0, lng: -96.0 }
const near = makeGate({ name: 'Near', lat: 32.01, lng: -96.0 }) // ~0.7 mi
const mid = makeGate({ name: 'Mid', lat: 32.3, lng: -96.0 }) // ~21 mi
const far = makeGate({ name: 'Far', lat: 33.0, lng: -96.0 }) // ~69 mi
const veryFar = makeGate({ name: 'Very far', lat: 34.0, lng: -96.0 }) // ~138 mi
const veryVeryFar = makeGate({ name: 'Very very far', lat: 34.9, lng: -96.0 }) // ~200 mi

describe('selectClosestGates', () => {
  it('returns at most 5 gates, sorted nearest first', () => {
    const gates = [far, veryVeryFar, near, mid, veryFar, makeGate({ name: 'Extra', lat: 32.02, lng: -96.0 })]
    const result = selectClosestGates(gates, here)
    expect(result).toHaveLength(5)
    expect(result[0].name).toBe('Near')
    expect(result.map((gate) => gate.distanceMiles)).toEqual(
      [...result.map((gate) => gate.distanceMiles)].sort((a, b) => (a ?? 0) - (b ?? 0)),
    )
  })

  it('sorts unlocated gates last rather than excluding them', () => {
    const unlocated = makeGate({ name: 'No location' })
    const result = selectClosestGates([unlocated, near], here)
    expect(result.map((gate) => gate.name)).toEqual(['Near', 'No location'])
  })
})

describe('selectRecentGates', () => {
  it('returns at most 3 gates, newest first', () => {
    const older = makeGate({ name: 'Older', createdAt: '2026-01-01T00:00:00.000Z' })
    const newer = makeGate({ name: 'Newer', createdAt: '2026-01-03T00:00:00.000Z' })
    const newest = makeGate({ name: 'Newest', createdAt: '2026-01-04T00:00:00.000Z' })
    const middle = makeGate({ name: 'Middle', createdAt: '2026-01-02T00:00:00.000Z' })

    const result = selectRecentGates([older, newer, newest, middle], null)

    expect(result.map((gate) => gate.name)).toEqual(['Newest', 'Newer', 'Middle'])
  })
})
