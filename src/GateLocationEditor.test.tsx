import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { GateLocationEditor } from './GateLocationEditor'

const originalOnLine = navigator.onLine

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
}

type MapClickHandler = (event: { detail: { latLng: { lat: number; lng: number } | null } }) => void
type MarkerDragEndHandler = (event: {
  latLng: { lat: () => number; lng: () => number } | null
}) => void

let capturedMapOnClick: MapClickHandler | undefined
let capturedDragEnd: MarkerDragEndHandler | undefined

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Map: ({ children, onClick }: { children: ReactNode; onClick?: MapClickHandler }) => {
    capturedMapOnClick = onClick
    return <div data-testid="map">{children}</div>
  },
  AdvancedMarker: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode
    onDragEnd?: MarkerDragEndHandler
  }) => {
    capturedDragEnd = onDragEnd
    return <div>{children}</div>
  },
}))

beforeEach(() => {
  setOnLine(true)
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY = 'test-key'
  capturedMapOnClick = undefined
  capturedDragEnd = undefined
})

afterEach(() => {
  setOnLine(originalOnLine)
})

describe('GateLocationEditor', () => {
  it('shows the offline fallback without mounting the map SDK', () => {
    setOnLine(false)
    render(<GateLocationEditor lat={32.5} lng={-96.5} onUpdateLocation={vi.fn()} />)

    expect(screen.getByText('Map needs an internet connection')).toBeInTheDocument()
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  })

  it('calls onUpdateLocation when the marker is dragged', () => {
    const onUpdateLocation = vi.fn()
    render(<GateLocationEditor lat={32.5} lng={-96.5} onUpdateLocation={onUpdateLocation} />)

    capturedDragEnd?.({ latLng: { lat: () => 32.6, lng: () => -96.6 } })

    expect(onUpdateLocation).toHaveBeenCalledWith({ lat: 32.6, lng: -96.6 })
  })

  it('calls onUpdateLocation on click-to-move, as a fallback to dragging', () => {
    const onUpdateLocation = vi.fn()
    render(<GateLocationEditor lat={32.5} lng={-96.5} onUpdateLocation={onUpdateLocation} />)

    capturedMapOnClick?.({ detail: { latLng: { lat: 32.7, lng: -96.7 } } })

    expect(onUpdateLocation).toHaveBeenCalledWith({ lat: 32.7, lng: -96.7 })
  })
})
