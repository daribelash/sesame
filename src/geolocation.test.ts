import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentFix } from './geolocation'

const originalGeolocation = navigator.geolocation

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: originalGeolocation,
    configurable: true,
  })
})

function mockGeolocation(
  getCurrentPosition: (
    success: PositionCallback,
    error: PositionErrorCallback,
  ) => void,
) {
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition: vi.fn(getCurrentPosition) },
    configurable: true,
  })
}

describe('getCurrentFix', () => {
  it('resolves a fix on success', async () => {
    mockGeolocation((success) => {
      success({
        coords: { latitude: 32.7767, longitude: -96.797, accuracy: 12 },
      } as GeolocationPosition)
    })

    expect(await getCurrentFix()).toEqual({
      status: 'success',
      fix: { lat: 32.7767, lng: -96.797, accuracy: 12 },
    })
  })

  it('degrades to "denied" when the user refuses the permission', async () => {
    mockGeolocation((_success, error) => {
      error({ code: 1 } as GeolocationPositionError)
    })

    expect(await getCurrentFix()).toEqual({ status: 'error', reason: 'denied' })
  })

  it('degrades to "unavailable" when the position cannot be determined', async () => {
    mockGeolocation((_success, error) => {
      error({ code: 2 } as GeolocationPositionError)
    })

    expect(await getCurrentFix()).toEqual({ status: 'error', reason: 'unavailable' })
  })

  it('degrades to "timeout" when the fix takes too long', async () => {
    mockGeolocation((_success, error) => {
      error({ code: 3 } as GeolocationPositionError)
    })

    expect(await getCurrentFix()).toEqual({ status: 'error', reason: 'timeout' })
  })

  it('degrades to "unavailable" when geolocation is not supported', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    })

    expect(await getCurrentFix()).toEqual({ status: 'error', reason: 'unavailable' })
  })
})
