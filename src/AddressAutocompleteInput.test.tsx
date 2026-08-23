import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AddressAutocompleteInput } from './AddressAutocompleteInput'

function makeSuggestion(placeId: string, text: string) {
  return { placePrediction: { placeId, text: { text } } }
}

// The debounce timer's callback resolves a promise and updates state outside
// any RTL-wrapped event, so the resulting re-render needs an explicit act()
// to flush before assertions run.
async function advanceDebounce(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const fetchAutocompleteSuggestions = vi.fn()

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useMapsLibrary: () => ({
    AutocompleteSessionToken: class {},
    AutocompleteSuggestion: { fetchAutocompleteSuggestions },
  }),
}))

beforeEach(() => {
  vi.useFakeTimers()
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY = 'test-key'
  fetchAutocompleteSuggestions.mockReset()
  fetchAutocompleteSuggestions.mockResolvedValue({
    suggestions: [makeSuggestion('p1', '130 Oakwood Dr'), makeSuggestion('p2', '132 Oakwood Dr')],
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AddressAutocompleteInput', () => {
  it('falls back to a plain input when no API key is configured', () => {
    delete import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    const onChange = vi.fn()
    render(<AddressAutocompleteInput id="addr" value="" onChange={onChange} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '130 Oak' } })

    expect(onChange).toHaveBeenCalledWith('130 Oak')
    expect(fetchAutocompleteSuggestions).not.toHaveBeenCalled()
  })

  it('fetches and shows suggestions after typing, debounced', async () => {
    render(<AddressAutocompleteInput id="addr" value="" onChange={vi.fn()} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '130 Oak' } })
    expect(fetchAutocompleteSuggestions).not.toHaveBeenCalled()

    await advanceDebounce(300)

    expect(fetchAutocompleteSuggestions).toHaveBeenCalledOnce()
    expect(screen.getByRole('option', { name: '130 Oakwood Dr' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '132 Oakwood Dr' })).toBeInTheDocument()
  })

  it('selecting a suggestion fills the field and closes the dropdown', async () => {
    const onChange = vi.fn()
    render(<AddressAutocompleteInput id="addr" value="" onChange={onChange} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '130 Oak' } })
    await advanceDebounce(300)

    fireEvent.mouseDown(screen.getByRole('option', { name: '130 Oakwood Dr' }))

    expect(onChange).toHaveBeenCalledWith('130 Oakwood Dr')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('arrow keys navigate and Enter selects the highlighted suggestion', async () => {
    const onChange = vi.fn()
    render(<AddressAutocompleteInput id="addr" value="" onChange={onChange} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '130 Oak' } })
    await advanceDebounce(300)

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith('130 Oakwood Dr')
  })

  it('closes on Escape without selecting', async () => {
    const onChange = vi.fn()
    render(<AddressAutocompleteInput id="addr" value="" onChange={onChange} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '130 Oak' } })
    await advanceDebounce(300)

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith('130 Oak')
    expect(onChange).not.toHaveBeenCalledWith('130 Oakwood Dr')
  })
})
