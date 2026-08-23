export interface GateMarkerIcon {
  className: string
}

/** Pure so it's unit-testable without mounting a real map. Flags failed-code
 * gates on the pin itself, same reasoning as the list badge: this app is
 * read in direct sunlight, one glance should show trouble. */
export function buildGateIcon(failed: boolean): GateMarkerIcon {
  return {
    className: failed ? 'gate-marker gate-marker--flagged' : 'gate-marker',
  }
}
