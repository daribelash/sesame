import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Coordinates } from './distance'

interface AddressAutocompleteInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Fires with the picked suggestion's coordinates, or null once the text
   * no longer matches a picked suggestion (the user edited it further). Free
   * typing without ever picking a suggestion never fires this at all. */
  onPlaceSelected?: (coords: Coordinates | null) => void
}

// Suggestions are a progressive enhancement over plain typing, never a
// requirement — CLAUDE.md's address field stays free text with no geocoding
// dependency. Without a configured API key, or when a request fails (offline,
// quota), this silently behaves like an ordinary input instead of erroring.
export function AddressAutocompleteInput(props: AddressAutocompleteInputProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

  if (!apiKey) {
    return (
      <input
        id={props.id}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        autoComplete="off"
      />
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <AddressAutocompleteField {...props} />
    </APIProvider>
  )
}

const DEBOUNCE_MS = 250

function AddressAutocompleteField({
  id,
  value,
  onChange,
  placeholder,
  onPlaceSelected,
}: AddressAutocompleteInputProps) {
  const placesLibrary = useMapsLibrary('places')
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  // One token per typing episode, per Google's billing guidance — reused
  // across keystrokes, discarded once a suggestion is picked (or the field
  // is abandoned) so the next episode starts a fresh, correctly-billed one.
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => window.clearTimeout(debounceRef.current)
  }, [])

  function handleChange(nextValue: string) {
    onChange(nextValue)
    onPlaceSelected?.(null)
    window.clearTimeout(debounceRef.current)

    if (!placesLibrary || !nextValue.trim()) {
      setSuggestions([])
      setOpen(false)
      return
    }

    debounceRef.current = window.setTimeout(() => {
      void fetchSuggestions(nextValue)
    }, DEBOUNCE_MS)
  }

  async function fetchSuggestions(query: string) {
    if (!placesLibrary) return

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken()
    }

    try {
      const { suggestions: results } = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        sessionToken: sessionTokenRef.current,
      })
      setSuggestions(results)
      setOpen(results.length > 0)
      setHighlighted(-1)
    } catch {
      setSuggestions([])
      setOpen(false)
    }
  }

  async function selectSuggestion(suggestion: google.maps.places.AutocompleteSuggestion) {
    onChange(suggestion.placePrediction?.text.text ?? '')
    setSuggestions([])
    setOpen(false)
    sessionTokenRef.current = null

    if (!suggestion.placePrediction || !onPlaceSelected) return
    try {
      const { place } = await suggestion.placePrediction.toPlace().fetchFields({ fields: ['location'] })
      const location = place.location
      onPlaceSelected(location ? { lat: location.lat(), lng: location.lng() } : null)
    } catch {
      // The suggestion text is already filled in either way — a failed
      // location lookup just means no address-based pin, not a broken form.
      onPlaceSelected(null)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
    } else if (event.key === 'Enter' && highlighted >= 0) {
      event.preventDefault()
      void selectSuggestion(suggestions[highlighted])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="autocomplete">
      <input
        id={id}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => window.setTimeout(() => setOpen(false), 100)}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-suggestions`}
        autoComplete="off"
      />
      {open && (
        <ul className="autocomplete-suggestions" role="listbox" id={`${id}-suggestions`}>
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.placePrediction?.placeId ?? index}
              role="option"
              aria-selected={index === highlighted}
              className={index === highlighted ? 'active' : undefined}
              onMouseDown={(event) => {
                // Fires before the input's onBlur, so the click registers
                // before the dropdown closes.
                event.preventDefault()
                void selectSuggestion(suggestion)
              }}
            >
              {suggestion.placePrediction?.text.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
