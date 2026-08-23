import { distanceInMiles, type Coordinates } from './distance'
import type { Gate } from './repository'

export interface GateWithDistance extends Gate {
  distanceMiles: number | null
}

const CLOSEST_GATE_COUNT = 5
const RECENT_GATE_COUNT = 3

/** Exported so callers that need to resolve one specific gate (e.g. opening
 * a detail sheet from search or the map) can annotate it the same way. */
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
 * The 5 closest gates by distance, for a quick main-page glance. Unlocated
 * gates sort last rather than being excluded, so a freshly-added gate still
 * surfaces here.
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
