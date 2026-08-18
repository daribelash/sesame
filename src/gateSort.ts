import { distanceInMiles, type Coordinates } from './distance'
import type { Gate } from './repository'

export interface GateWithDistance extends Gate {
  distanceMiles: number | null
}

export const RADIUS_OPTIONS_MILES = [0.5, 1, 2, 5] as const

/**
 * Gates within the radius, nearest first, plus the three nearest gates even
 * if they fall outside it — the radius trims noise but must never produce an
 * empty screen (see CLAUDE.md: nearest-three-always).
 *
 * Gates without a recorded location can't be placed in this ordering; they
 * are appended at the end, unfiltered.
 */
export function selectVisibleGates(
  gates: Gate[],
  currentPosition: Coordinates | null,
  radiusMiles: number,
): GateWithDistance[] {
  if (!currentPosition) {
    return gates.map((gate) => ({ ...gate, distanceMiles: null }))
  }

  const withDistance: GateWithDistance[] = gates.map((gate) => ({
    ...gate,
    distanceMiles:
      gate.lat != null && gate.lng != null
        ? distanceInMiles(currentPosition, { lat: gate.lat, lng: gate.lng })
        : null,
  }))

  const located = withDistance
    .filter((gate): gate is GateWithDistance & { distanceMiles: number } => gate.distanceMiles !== null)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
  const unlocated = withDistance.filter((gate) => gate.distanceMiles === null)

  const nearestThreeIds = new Set(located.slice(0, 3).map((gate) => gate.id))
  const visible = located.filter(
    (gate) => gate.distanceMiles <= radiusMiles || nearestThreeIds.has(gate.id),
  )

  return [...visible, ...unlocated]
}
