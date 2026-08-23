import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { GateMap } from './GateMap'
import type { Gate } from './repository'

const originalOnLine = navigator.onLine

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
}

let fakeMapDiv: HTMLDivElement

vi.mock('@vis.gl/react-google-maps', () => {
  return {
    APIProvider: ({ children }: { children: ReactNode }) => (
      <div data-testid="api-provider">{children}</div>
    ),
    Map: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
    AdvancedMarker: ({
      children,
      onClick,
    }: {
      children: ReactNode
      onClick?: () => void
    }) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
    InfoWindow: ({
      children,
      onCloseClick,
    }: {
      children: ReactNode
      onCloseClick?: () => void
    }) => (
      <div role="dialog">
        {children}
        <button type="button" onClick={onCloseClick}>
          Close
        </button>
      </div>
    ),
    useMap: () => ({
      getDiv: () => fakeMapDiv,
      getBounds: () => ({
        getNorthEast: () => ({ lat: () => 33, lng: () => -96 }),
        getSouthWest: () => ({ lat: () => 32, lng: () => -97 }),
      }),
    }),
  }
})

function makeGate(overrides: Partial<Gate> & { id: string; name: string }): Gate {
  const now = new Date().toISOString()
  return {
    code: '0451#',
    notes: '',
    lat: 32.5,
    lng: -96.5,
    accuracy: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    codeHistory: [],
    failedAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  setOnLine(true)
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY = 'test-key'
  fakeMapDiv = document.createElement('div')
  fakeMapDiv.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 300, height: 300, right: 300, bottom: 300, x: 0, y: 0 }) as DOMRect
})

afterEach(() => {
  setOnLine(originalOnLine)
  vi.useRealTimers()
})

describe('GateMap', () => {
  it('shows the offline fallback without mounting the map SDK', () => {
    setOnLine(false)
    render(<GateMap gates={[]} addressesByGate={new Map()} onCreateGateAt={vi.fn()} />)

    expect(screen.getByText('Map needs an internet connection')).toBeInTheDocument()
    expect(screen.queryByTestId('api-provider')).not.toBeInTheDocument()
  })

  it('renders one marker per located gate, skipping unlocated ones', () => {
    const gates = [
      makeGate({ id: 'g1', name: 'Oakwood Estates' }),
      makeGate({ id: 'g2', name: 'Cedar Ridge', lat: 32.6, lng: -96.6 }),
      makeGate({ id: 'g3', name: 'No location', lat: null, lng: null }),
    ]
    render(<GateMap gates={gates} addressesByGate={new Map()} onCreateGateAt={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Open Oakwood Estates on the map' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Cedar Ridge on the map' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /No location/ })).not.toBeInTheDocument()
  })

  it('shows an info window with the code when a marker is clicked', async () => {
    const gates = [makeGate({ id: 'g1', name: 'Oakwood Estates', code: '0451#' })]
    const user = userEvent.setup()
    render(<GateMap gates={gates} addressesByGate={new Map()} onCreateGateAt={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Open Oakwood Estates on the map' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Oakwood Estates')
    expect(dialog).toHaveTextContent('0451#')
  })

  it('calls onCreateGateAt after a long press on empty map space', () => {
    vi.useFakeTimers()
    const onCreateGateAt = vi.fn()
    render(<GateMap gates={[]} addressesByGate={new Map()} onCreateGateAt={onCreateGateAt} />)

    fakeMapDiv.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 150, clientY: 150, bubbles: true }),
    )
    vi.advanceTimersByTime(500)

    expect(onCreateGateAt).toHaveBeenCalledOnce()
    const coords = (onCreateGateAt as Mock).mock.calls[0][0]
    expect(coords.lat).toBeCloseTo(32.5, 1)
    expect(coords.lng).toBeCloseTo(-96.5, 1)
  })

  it('cancels the long press if the pointer moves before the threshold', () => {
    vi.useFakeTimers()
    const onCreateGateAt = vi.fn()
    render(<GateMap gates={[]} addressesByGate={new Map()} onCreateGateAt={onCreateGateAt} />)

    fakeMapDiv.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 150, clientY: 150, bubbles: true }),
    )
    fakeMapDiv.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 200, clientY: 200, bubbles: true }),
    )
    vi.advanceTimersByTime(500)

    expect(onCreateGateAt).not.toHaveBeenCalled()
  })
})
