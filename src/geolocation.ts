// Wraps navigator.geolocation so a missing fix never blocks saving a gate.
// Callers get a result they can branch on instead of a rejected promise.

export interface GeolocationFix {
  lat: number
  lng: number
  accuracy: number
}

export type GeolocationResult =
  | { status: 'success'; fix: GeolocationFix }
  | { status: 'error'; reason: 'denied' | 'timeout' | 'unavailable' }

function reasonForCode(code: number): 'denied' | 'timeout' | 'unavailable' {
  switch (code) {
    case 1: // PERMISSION_DENIED
      return 'denied'
    case 3: // TIMEOUT
      return 'timeout'
    default: // POSITION_UNAVAILABLE
      return 'unavailable'
  }
}

export function getCurrentFix(): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ status: 'error', reason: 'unavailable' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: 'success',
          fix: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        })
      },
      (error) => {
        resolve({ status: 'error', reason: reasonForCode(error.code) })
      },
      { enableHighAccuracy: true },
    )
  })
}
