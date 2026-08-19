import { describe, expect, it } from 'vitest'
import { selectVisibleGates } from './gateSort'
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

describe('selectVisibleGates', () => {
  it('sorts by distance from the current position, nearest first', () => {
    const result = selectVisibleGates([far, near, mid], here, 100)
    expect(result.map((gate) => gate.name)).toEqual(['Near', 'Mid', 'Far'])
  })

  it('excludes gates beyond the radius and beyond the three nearest', () => {
    const result = selectVisibleGates(
      [near, mid, far, veryFar, veryVeryFar],
      here,
      150, // includes veryFar (~138mi) but not veryVeryFar (~200mi)
    )
    expect(result.map((gate) => gate.name)).toEqual(['Near', 'Mid', 'Far', 'Very far'])
  })

  it('always shows the three nearest gates even outside the radius', () => {
    const result = selectVisibleGates([near, mid, far, veryFar], here, 0.5)
    expect(result.map((gate) => gate.name)).toEqual(['Near', 'Mid', 'Far'])
  })

  it('never produces an empty screen when nothing is within radius', () => {
    const result = selectVisibleGates([far, veryFar], here, 0.1)
    expect(result.length).toBeGreaterThan(0)
  })

  it('appends gates with no recorded location, unfiltered by radius', () => {
    const unlocated = makeGate({ name: 'No location' })
    const result = selectVisibleGates([far, unlocated], here, 100)
    expect(result.map((gate) => gate.name)).toEqual(['Far', 'No location'])
    expect(result[1].distanceMiles).toBeNull()
  })

  it('returns gates unfiltered with a null distance when position is unknown', () => {
    const result = selectVisibleGates([near, far], null, 1)
    expect(result.map((gate) => gate.name)).toEqual(['Near', 'Far'])
    expect(result.every((gate) => gate.distanceMiles === null)).toBe(true)
  })
})
