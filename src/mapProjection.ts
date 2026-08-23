export interface LatLngBoundsLiteral {
  north: number
  south: number
  east: number
  west: number
}

/**
 * Approximates a pixel position within the map viewport as a lat/lng, via
 * linear interpolation across the currently visible bounds — not a true
 * Mercator projection (accuracy degrades at extreme latitudes/zoom), but
 * plenty precise for placing a new gate pin at city scale; the driver can
 * always drag-correct it afterward (see GateDetailSheet's location editor).
 * ratioX/ratioY are 0..1 fractions of the container width/height.
 */
export function interpolateLatLng(
  bounds: LatLngBoundsLiteral,
  ratioX: number,
  ratioY: number,
): { lat: number; lng: number } {
  return {
    lat: bounds.north - ratioY * (bounds.north - bounds.south),
    lng: bounds.west + ratioX * (bounds.east - bounds.west),
  }
}
