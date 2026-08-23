import { useState, type FormEvent } from 'react'
import type { NewGateInput } from './repository'
import { getCurrentFix } from './geolocation'
import type { Coordinates } from './distance'

interface GateFormProps {
  /** Address is optional — when provided, the caller also creates an
   * address record for the new gate (one gate, many addresses). */
  onAdd: (input: NewGateInput, address?: string) => void
  /** When set (e.g. a long-press on the map), these coordinates are used
   * directly instead of capturing a fresh GPS fix on submit — the user just
   * pointed at the exact intended spot. */
  initialCoordinates?: Coordinates
  /** When provided, renders a Cancel/Save button row instead of a lone Save
   * button — used when the form lives in a dismissible sheet. */
  onCancel?: () => void
}

export function GateForm({ onAdd, initialCoordinates, onCancel }: GateFormProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !code.trim()) return

    // Explicit long-press coordinates win over a fresh GPS fix — the user
    // just pointed at the exact intended spot, and it isn't a GPS reading
    // so there's no accuracy figure to record.
    const { lat, lng, accuracy } = initialCoordinates
      ? { lat: initialCoordinates.lat, lng: initialCoordinates.lng, accuracy: null }
      : await captureFix()

    onAdd(
      { name: name.trim(), code: code.trim(), notes: notes.trim(), lat, lng, accuracy },
      address.trim() || undefined,
    )
    setName('')
    setCode('')
    setAddress('')
    setNotes('')
  }

  async function captureFix() {
    const result = await getCurrentFix()
    const fix = result.status === 'success' ? result.fix : null
    return { lat: fix?.lat ?? null, lng: fix?.lng ?? null, accuracy: fix?.accuracy ?? null }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="gate-name">Gate name</label>
        <input
          id="gate-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="gate-code">Code</label>
        <input
          id="gate-code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="gate-address">Address (optional)</label>
        <input
          id="gate-address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="123 Oak Lane"
        />
      </div>

      <div className="field">
        <label htmlFor="gate-notes">Notes</label>
        <textarea
          id="gate-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      {onCancel ? (
        <div className="btn-row">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit">Save gate</button>
        </div>
      ) : (
        <button type="submit">Save gate</button>
      )}
    </form>
  )
}
