import { useState, type FormEvent } from 'react'
import type { NewGateInput } from './repository'

interface GateFormProps {
  onAdd: (input: NewGateInput) => void
}

export function GateForm({ onAdd }: GateFormProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !code.trim()) return

    onAdd({ name: name.trim(), code: code.trim(), notes: notes.trim() })
    setName('')
    setCode('')
    setNotes('')
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
        <label htmlFor="gate-notes">Notes</label>
        <textarea
          id="gate-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <button type="submit">Save gate</button>
    </form>
  )
}
