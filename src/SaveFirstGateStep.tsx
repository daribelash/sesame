import { useState, type FormEvent } from 'react'
import type { NewGateInput } from './repository'
import { getCurrentFix } from './geolocation'
import { PinIcon, ClockIcon } from './icons'

interface SaveFirstGateStepProps {
  onSave: (input: NewGateInput) => void
  onSkip: () => void
}

// Step 2 of 3 in the register flow — deliberately minimal (name + code only,
// no address/notes) so finishing registration doesn't require more typing
// than necessary. Skippable: a new user may not be standing at a gate yet.
export function SaveFirstGateStep({ onSave, onSkip }: SaveFirstGateStepProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !code.trim()) return

    const result = await getCurrentFix()
    const fix = result.status === 'success' ? result.fix : null

    onSave({
      name: name.trim(),
      code: code.trim(),
      notes: '',
      lat: fix?.lat ?? null,
      lng: fix?.lng ?? null,
      accuracy: fix?.accuracy ?? null,
    })
  }

  return (
    <div className="save-first-gate">
      <div className="save-first-gate-header">
        <div className="icon-badge icon-badge--sm">
          <PinIcon size={22} />
        </div>
        <div className="save-first-gate-heading">
          <div className="step-header">
            <p className="step-label">Step 2 of 3</p>
            <button type="button" className="link-button" onClick={onSkip}>
              Skip this step
            </button>
          </div>
          <h1>Save your first gate</h1>
        </div>
      </div>

      <p className="save-first-gate-body">
        Standing at the gate? Type the code, tap save — Sesame grabs your GPS fix automatically.
        No address typing required.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="card elev-sm auth-fields">
          <div className="field">
            <label htmlFor="first-gate-name">Gate name</label>
            <input
              id="first-gate-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="first-gate-code">Code</label>
            <input
              id="first-gate-code"
              className="mono-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>

          <p className="chip location-chip">
            <ClockIcon />
            <span>Location captured automatically</span>
          </p>
        </div>

        <button type="submit" className="btn-block">
          Save gate
        </button>
      </form>
    </div>
  )
}
