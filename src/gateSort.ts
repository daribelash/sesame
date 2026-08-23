import { distanceInMiles, type Coordinates } from './distance'
import type { Gate } from './repository'

export interface GateWithDistance extends Gate {
  distanceMiles: number | null
}

export const RADIUS_OPTIONS_MILES = [0.5, 1, 2, 5] as const
const CLOSEST_GATE_COUNT = 5
const RECENT_GATE_COUNT = 3

/** Exported so callers that need to resolve one specific gate (e.g. opening
 * a detail sheet from search or the map, where the gate might not be in the
 * radius-filtered list) can annotate it the same way. */
export function annotateWithDistance(gate: Gate, currentPosition: Coordinates | null): GateWithDistance {
  return {
    ...gate,
    distanceMiles:
      currentPosition && gate.lat != null && gate.lng != null
        ? distanceInMiles(currentPosition, { lat: gate.lat, lng: gate.lng })
        : null,
  }
}

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
    return gates.map((gate) => annotateWithDistance(gate, currentPosition))
  }

  const withDistance = gates.map((gate) => annotateWithDistance(gate, currentPosition))

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

/**
 * The 5 closest gates by distance, for a quick main-page glance — distinct
 * from selectVisibleGates's radius filter, which governs the main list.
 * Unlocated gates sort last rather than being excluded, so a freshly-added
 * gate still surfaces here.
 */
export function selectClosestGates(
  gates: Gate[],
  currentPosition: Coordinates | null,
): GateWithDistance[] {
  return gates
    .map((gate) => annotateWithDistance(gate, currentPosition))
    .sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity))
    .slice(0, CLOSEST_GATE_COUNT)
}

/** The 3 most-recently-created gates, newest first — a quick "what did I
 * just save" glance, independent of distance or radius. */
export function selectRecentGates(
  gates: Gate[],
  currentPosition: Coordinates | null,
): GateWithDistance[] {
  return [...gates]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RECENT_GATE_COUNT)
    .map((gate) => annotateWithDistance(gate, currentPosition))
}
