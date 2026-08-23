export interface GateMarkerIcon {
  /** The number badge shown on the pin — address count under that gate. */
  label: string
  className: string
}

/** Pure so it's unit-testable without mounting a real map. Flags failed-code
 * gates on the pin itself, same reasoning as the list badge: this app is
 * read in direct sunlight, one glance should show trouble. */
export function buildGateIcon(addressCount: number, failed: boolean): GateMarkerIcon {
  return {
    label: String(addressCount),
    className: failed ? 'gate-marker gate-marker--flagged' : 'gate-marker',
  }
}
