import { useState, type FormEvent } from 'react'

export interface GateEditChanges {
  name: string
  code: string
  notes: string
}

interface GateEditFormProps {
  name: string
  code: string
  notes: string
  onSave: (changes: GateEditChanges) => void
  onCancel: () => void
}

// Name, code, and notes edited together in one place — replaces the
// always-visible inline "Change code" control with a single Edit action,
// matching the design's Edit/Delete row.
export function GateEditForm({
  name: initialName,
  code: initialCode,
  notes: initialNotes,
  onSave,
  onCancel,
}: GateEditFormProps) {
  const [name, setName] = useState(initialName)
  const [code, setCode] = useState(initialCode)
  const [notes, setNotes] = useState(initialNotes)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !code.trim()) return
    onSave({ name: name.trim(), code: code.trim(), notes: notes.trim() })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="edit-gate-name">Gate name</label>
        <input
          id="edit-gate-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="edit-gate-code">Code</label>
        <input
          id="edit-gate-code"
          className="mono-input"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="edit-gate-notes">Notes</label>
        <textarea
          id="edit-gate-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit">Save</button>
      </div>
    </form>
  )
}
