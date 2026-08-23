import { GateForm } from './GateForm'
import type { NewGateInput } from './repository'
import type { Coordinates } from './distance'
import { CloseIcon } from './icons'

interface AddGateSheetProps {
  onAdd: (input: NewGateInput, address?: string) => void
  onClose: () => void
  /** Prefills location from a map long-press instead of a fresh GPS fix. */
  initialCoordinates?: Coordinates
}

export function AddGateSheet({ onAdd, onClose, initialCoordinates }: AddGateSheetProps) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Add a gate"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <h2>Add a gate</h2>
          <button type="button" className="link-button" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <GateForm
          initialCoordinates={initialCoordinates}
          onAdd={(input, address) => {
            onAdd(input, address)
            onClose()
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}
