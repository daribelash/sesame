import { describe, expect, it } from 'vitest'
import { interpolateLatLng } from './mapProjection'

const bounds = { north: 33.0, south: 32.0, east: -96.0, west: -97.0 }

describe('interpolateLatLng', () => {
  it('returns the north-west corner at ratio (0, 0)', () => {
    expect(interpolateLatLng(bounds, 0, 0)).toEqual({ lat: 33.0, lng: -97.0 })
  })

  it('returns the south-east corner at ratio (1, 1)', () => {
    expect(interpolateLatLng(bounds, 1, 1)).toEqual({ lat: 32.0, lng: -96.0 })
  })

  it('returns the center at ratio (0.5, 0.5)', () => {
    expect(interpolateLatLng(bounds, 0.5, 0.5)).toEqual({ lat: 32.5, lng: -96.5 })
  })
})
