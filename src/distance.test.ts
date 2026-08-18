import { describe, expect, it } from 'vitest'
import { distanceInMiles } from './distance'

describe('distanceInMiles', () => {
  it('is zero for the same point', () => {
    const point = { lat: 32.7767, lng: -96.797 }
    expect(distanceInMiles(point, point)).toBe(0)
  })

  it('is about 69 miles for one degree of latitude at the equator', () => {
    const distance = distanceInMiles({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
    expect(distance).toBeGreaterThan(68)
    expect(distance).toBeLessThan(70)
  })

  it('matches the known great-circle distance between JFK and LAX', () => {
    const jfk = { lat: 40.6413, lng: -73.7781 }
    const lax = { lat: 33.9416, lng: -118.4085 }
    expect(distanceInMiles(jfk, lax)).toBeCloseTo(2469.6, 0)
  })

  it('is symmetric', () => {
    const a = { lat: 48.8566, lng: 2.3522 }
    const b = { lat: 51.5074, lng: -0.1278 }
    expect(distanceInMiles(a, b)).toBeCloseTo(distanceInMiles(b, a), 6)
  })
})
