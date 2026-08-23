import { useId, useState, type FormEvent } from 'react'
import type { NewAddressInput } from './addressRepository'

interface AddressFormProps {
  gateId: string
  onAdd: (input: NewAddressInput) => void
}

export function AddressForm({ gateId, onAdd }: AddressFormProps) {
  const [adding, setAdding] = useState(false)
  const [address, setAddress] = useState('')
  const addressInputId = useId()

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

    onAdd({ gateId, address: address.trim(), notes: '' })
    setAddress('')
    setAdding(false)
  }

  return (
    <form className="address-form" onSubmit={handleSubmit}>
      <label htmlFor={addressInputId}>New address</label>
      <div className="address-form-row">
        <input
          id={addressInputId}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="e.g. 132 Oakwood Dr"
          autoFocus
          required
        />
        <button type="submit">Add</button>
        <button type="button" className="link-button" onClick={() => setAdding(false)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
