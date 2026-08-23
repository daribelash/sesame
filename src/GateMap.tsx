import { useEffect, useRef, useState } from 'react'
import { APIProvider, AdvancedMarker, InfoWindow, Map, useMap } from '@vis.gl/react-google-maps'
import type { Gate } from './repository'
import type { Address } from './addressRepository'
import type { Coordinates } from './distance'
import { buildGateIcon } from './gateMarkerIcon'
import { interpolateLatLng } from './mapProjection'
import { useOnlineStatus } from './useOnlineStatus'

interface GateMapProps {
  /** All gates, unfiltered by radius — a map is its own spatial filter. */
  gates: Gate[]
  addressesByGate: Map<string, Address[]>
  onCreateGateAt: (coords: Coordinates) => void
}

const LONG_PRESS_MS = 500
const MOVE_CANCEL_PX = 10
// A fixed fallback so <Map> never receives an undefined center on a fresh
// account with no GPS fix and no located gates yet (contiguous US, zoomed out).
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }
const DEFAULT_ZOOM = 4
const LOCATED_ZOOM = 13

// Google's Maps JS API terms forbid caching tiles for offline reuse, so
// unlike the rest of this app, the map cannot work with no signal — this is
// the one deliberate, scoped exception to the local-first guarantee
// (CLAUDE.md). Rather than let the SDK fail unpredictably offline, check
// navigator.onLine explicitly and show a plain, honest fallback instead of
// attempting to mount anything.
export function GateMap({ gates, addressesByGate, onCreateGateAt }: GateMapProps) {
  const online = useOnlineStatus()

  if (!online) {
    return <p className="map-card-placeholder">Map needs an internet connection</p>
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  if (!apiKey) {
    return <p className="map-card-placeholder">Map unavailable — no API key configured</p>
  }

  const located = gates.filter((gate) => gate.lat != null && gate.lng != null)
  const center = located.length > 0 ? { lat: located[0].lat!, lng: located[0].lng! } : DEFAULT_CENTER
  const zoom = located.length > 0 ? LOCATED_ZOOM : DEFAULT_ZOOM

  return (
    <APIProvider apiKey={apiKey}>
      <GateMapView
        center={center}
        zoom={zoom}
        located={located}
        addressesByGate={addressesByGate}
        onCreateGateAt={onCreateGateAt}
      />
    </APIProvider>
  )
}

interface GateMapViewProps {
  center: Coordinates
  zoom: number
  located: Gate[]
  addressesByGate: Map<string, Address[]>
  onCreateGateAt: (coords: Coordinates) => void
}

function GateMapView({ center, zoom, located, addressesByGate, onCreateGateAt }: GateMapViewProps) {
  const [pressPoint, setPressPoint] = useState<{ x: number; y: number } | null>(null)

  return (
    <div className="map-card-viewport">
      <Map
        mapId={(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) ?? 'DEMO_MAP_ID'}
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI
      >
        <LongPressToCreate onCreateGateAt={onCreateGateAt} onPressPointChange={setPressPoint} />
        {located.map((gate) => (
          <GatePin
            key={gate.id}
            gate={gate}
            addressCount={(addressesByGate.get(gate.id) ?? []).length}
          />
        ))}
      </Map>
      {pressPoint && (
        <div
          className="map-press-pulse"
          style={{ left: pressPoint.x, top: pressPoint.y }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

function GatePin({ gate, addressCount }: { gate: Gate; addressCount: number }) {
  const [open, setOpen] = useState(false)
  const icon = buildGateIcon(addressCount, gate.failedAt != null)
  const position = { lat: gate.lat!, lng: gate.lng! }

  return (
    <>
      <AdvancedMarker position={position} onClick={() => setOpen(true)}>
        <div className={icon.className} aria-label={`Open ${gate.name} on the map`}>
          {icon.label}
        </div>
      </AdvancedMarker>
      {open && (
        <InfoWindow position={position} onCloseClick={() => setOpen(false)}>
          <strong>{gate.name}</strong>
          <p className="code">{gate.code}</p>
          {gate.failedAt != null && <p>⚠ Reported not working</p>}
        </InfoWindow>
      )}
    </>
  )
}

/** Long-press empty map space to start a new gate there. Implemented as a
 * manual pointerdown+timer over the map's own DOM node rather than relying
 * on Maps' click/contextmenu events, whose long-press semantics are
 * inconsistent on iOS Safari touch — this way the gesture is entirely our
 * own and doesn't depend on what Maps decides to synthesize. */
interface LongPressToCreateProps {
  onCreateGateAt: (coords: Coordinates) => void
  /** Container-relative pixel position while a press is held, for the
   * visual pulse — null when not pressing. */
  onPressPointChange: (point: { x: number; y: number } | null) => void
}

function LongPressToCreate({ onCreateGateAt, onPressPointChange }: LongPressToCreateProps) {
  const map = useMap()
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!map) return
    const div = map.getDiv()

    function clear() {
      startRef.current = null
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
      onPressPointChange(null)
    }

    function handlePointerDown(event: PointerEvent) {
      startRef.current = { x: event.clientX, y: event.clientY }
      const rect = div.getBoundingClientRect()
      onPressPointChange({ x: event.clientX - rect.left, y: event.clientY - rect.top })

      timerRef.current = setTimeout(() => {
        const start = startRef.current
        const bounds = map!.getBounds()
        if (!start || !bounds) return
        const ne = bounds.getNorthEast()
        const sw = bounds.getSouthWest()
        const coords = interpolateLatLng(
          { north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() },
          (start.x - rect.left) / rect.width,
          (start.y - rect.top) / rect.height,
        )
        clear()
        onCreateGateAt(coords)
      }, LONG_PRESS_MS)
    }

    function handlePointerMove(event: PointerEvent) {
      const start = startRef.current
      if (!start) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clear()
    }

    div.addEventListener('pointerdown', handlePointerDown)
    div.addEventListener('pointermove', handlePointerMove)
    div.addEventListener('pointerup', clear)
    div.addEventListener('pointercancel', clear)
    return () => {
      div.removeEventListener('pointerdown', handlePointerDown)
      div.removeEventListener('pointermove', handlePointerMove)
      div.removeEventListener('pointerup', clear)
      div.removeEventListener('pointercancel', clear)
      clear()
    }
  }, [map, onCreateGateAt, onPressPointChange])

  return null
}
