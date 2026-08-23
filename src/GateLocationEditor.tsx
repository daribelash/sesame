import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps'
import type { Coordinates } from './distance'
import { useOnlineStatus } from './useOnlineStatus'

interface GateLocationEditorProps {
  lat: number
  lng: number
  onUpdateLocation: (coords: Coordinates) => void
}

const ZOOM = 16

// Small single-marker map for correcting a gate's saved location, embedded
// in the gate detail sheet. Same offline exception as the main map (CLAUDE.md)
// — Google's Maps JS API can't cache tiles for reuse, so this needs a
// connection too.
export function GateLocationEditor({ lat, lng, onUpdateLocation }: GateLocationEditorProps) {
  const online = useOnlineStatus()
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

  if (!online) {
    return <p className="map-card-placeholder">Map needs an internet connection</p>
  }
  if (!apiKey) {
    return <p className="map-card-placeholder">Map unavailable — no API key configured</p>
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="map-card-viewport map-card-viewport--small">
        <Map
          mapId={(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) ?? 'DEMO_MAP_ID'}
          defaultCenter={{ lat, lng }}
          defaultZoom={ZOOM}
          gestureHandling="greedy"
          disableDefaultUI
          // Click/tap-to-move is the fallback for fiddly drag on a small
          // embedded map.
          onClick={(event) => {
            const position = event.detail.latLng
            if (position) onUpdateLocation({ lat: position.lat, lng: position.lng })
          }}
        >
          <AdvancedMarker
            position={{ lat, lng }}
            draggable
            onDragEnd={(event) => {
              const position = event.latLng
              if (position) onUpdateLocation({ lat: position.lat(), lng: position.lng() })
            }}
          >
            <div className="gate-marker" aria-label="Drag to correct this gate's location" />
          </AdvancedMarker>
        </Map>
      </div>
    </APIProvider>
  )
}
