import { useId, useState, type FormEvent } from 'react'
import type { NewAddressInput } from './addressRepository'

interface AddressFormProps {
  gateId: string
  onAdd: (input: NewAddressInput) => void
}

export function AddressForm({ gateId, onAdd }: AddressFormProps) {
  const [adding, setAdding] = useState(false)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const addressInputId = useId()
  const notesInputId = useId()

  if (!adding) {
    return (
      <button type="button" className="link-button" onClick={() => setAdding(true)}>
        Add address
      </button>
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!address.trim()) return

    onAdd({ gateId, address: address.trim(), notes: notes.trim() })
    setAddress('')
    setNotes('')
    setAdding(false)
  }

  return (
    <form className="address-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor={addressInputId}>Address</label>
        <input
          id={addressInputId}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          autoFocus
          required
        />
      </div>

      <div className="field">
        <label htmlFor={notesInputId}>Notes</label>
        <input
          id={notesInputId}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="beige house, side door"
        />
      </div>

      <button type="submit">Save</button>
      <button type="button" className="link-button" onClick={() => setAdding(false)}>
        Cancel
      </button>
    </form>
  )
}
