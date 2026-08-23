import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { GateForm } from './GateForm'

const GPS_FIX = { lat: 10, lng: 20, accuracy: 5 }
const ADDRESS_LOCATION = { lat: 37.422, lng: -122.084 }

const originalGeolocation = navigator.geolocation

function stubSuccessfulGeolocation() {
  Object.defineProperty(navigator, 'geolocation', {
    value: {
      getCurrentPosition: (success: PositionCallback) =>
        success({
          coords: {
            latitude: GPS_FIX.lat,
            longitude: GPS_FIX.lng,
            accuracy: GPS_FIX.accuracy,
          },
        } as GeolocationPosition),
    },
    configurable: true,
  })
}

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: originalGeolocation,
    configurable: true,
  })
})

function makeSuggestion(placeId: string, text: string, location: typeof ADDRESS_LOCATION | null) {
  return {
    placePrediction: {
      placeId,
      text: { text },
      toPlace: () => ({
        fetchFields: async () => ({
          place: {
            location: location ? { lat: () => location.lat, lng: () => location.lng } : undefined,
          },
        }),
      }),
    },
  }
}

const fetchAutocompleteSuggestions = vi.fn()

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useMapsLibrary: () => ({
    AutocompleteSessionToken: class {},
    AutocompleteSuggestion: { fetchAutocompleteSuggestions },
  }),
}))

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY = 'test-key'
  stubSuccessfulGeolocation()
  fetchAutocompleteSuggestions.mockReset()
  fetchAutocompleteSuggestions.mockResolvedValue({
    suggestions: [makeSuggestion('p1', '1600 Amphitheatre Pkwy', ADDRESS_LOCATION)],
  })
})

afterEach(() => {
  vi.useRealTimers()
})

function fillNameAndCode() {
  fireEvent.change(screen.getByLabelText('Gate name'), { target: { value: 'Oakwood Estates' } })
  fireEvent.change(screen.getByLabelText('Code'), { target: { value: '0451#' } })
}

async function fillAndPickAddress() {
  const input = screen.getByRole('combobox', { name: 'Address (optional)' })
  fireEvent.change(input, { target: { value: '1600 Amp' } })
  await flush(300)
  fireEvent.mouseDown(screen.getByRole('option', { name: '1600 Amphitheatre Pkwy' }))
  await flush()
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Save gate' }))
}

describe('GateForm', () => {
  it('captures a fresh GPS fix when no address location has been picked', async () => {
    const onAdd = vi.fn()
    render(<GateForm onAdd={onAdd} />)

    fillNameAndCode()
    submit()
    await flush()

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ lat: GPS_FIX.lat, lng: GPS_FIX.lng, accuracy: GPS_FIX.accuracy }),
      undefined,
    )
  })

  it('does not show the "use this address" checkbox until a suggestion resolves a location', async () => {
    render(<GateForm onAdd={vi.fn()} />)

    const input = screen.getByRole('combobox', { name: 'Address (optional)' })
    fireEvent.change(input, { target: { value: '1600 Amp' } })
    await flush(300)

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('shows the checkbox after picking a suggestion, and checking it overrides GPS on submit', async () => {
    const onAdd = vi.fn()
    render(<GateForm onAdd={onAdd} />)

    fillNameAndCode()
    await fillAndPickAddress()

    const checkbox = screen.getByRole('checkbox', {
      name: "Use this address's location for the map pin",
    })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)

    submit()
    await flush()

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: ADDRESS_LOCATION.lat,
        lng: ADDRESS_LOCATION.lng,
        accuracy: null,
      }),
      '1600 Amphitheatre Pkwy',
    )
  })

  it('leaves the checkbox unchecked by default, so GPS still wins even after picking a suggestion', async () => {
    const onAdd = vi.fn()
    render(<GateForm onAdd={onAdd} />)

    fillNameAndCode()
    await fillAndPickAddress()

    submit()
    await flush()

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ lat: GPS_FIX.lat, lng: GPS_FIX.lng, accuracy: GPS_FIX.accuracy }),
      '1600 Amphitheatre Pkwy',
    )
  })

  it('hides the checkbox again if the address is cleared after picking a suggestion', async () => {
    render(<GateForm onAdd={vi.fn()} />)

    await fillAndPickAddress()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()

    const input = screen.getByRole('combobox', { name: 'Address (optional)' })
    fireEvent.change(input, { target: { value: '' } })

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
