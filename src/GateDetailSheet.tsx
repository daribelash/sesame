import { useState } from 'react'
import type { GateWithDistance } from './gateSort'
import type { Address, NewAddressInput } from './addressRepository'
import type { Coordinates } from './distance'
import { AddressForm } from './AddressForm'
import { DeleteButton } from './DeleteButton'
import { GateLocationEditor } from './GateLocationEditor'
import { GateEditForm, type GateEditChanges } from './GateEditForm'
import { CloseIcon, WarningIcon } from './icons'

const ADDRESS_PREVIEW_COUNT = 3

interface GateDetailSheetProps {
  gate: GateWithDistance
  addresses: Address[]
  onClose: () => void
  onUpdateGate: (gateId: string, changes: GateEditChanges) => void
  onAddAddress: (input: NewAddressInput) => void
  onMarkCodeFailed: (gateId: string) => void
  onClearCodeFailed: (gateId: string) => void
  onDeleteGate: (gateId: string) => void
  onDeleteAddress: (addressId: string) => void
  onUpdateLocation: (gateId: string, coords: Coordinates) => void
}

// Slides up over the list — the one place all of a gate's actions live
// (edit, flag as not working, manage addresses, delete). No router: this is
// an overlay driven by App's activeGateId state, not a route.
export function GateDetailSheet({
  gate,
  addresses,
  onClose,
  onUpdateGate,
  onAddAddress,
  onMarkCodeFailed,
  onClearCodeFailed,
  onDeleteGate,
  onDeleteAddress,
  onUpdateLocation,
}: GateDetailSheetProps) {
  const flagged = gate.failedAt != null
  const [editing, setEditing] = useState(false)
  const [editingLocation, setEditingLocation] = useState(false)
  const [showAllAddresses, setShowAllAddresses] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)

  if (editing) {
    return (
      <div className="sheet-backdrop" onClick={onClose}>
        <div
          className="sheet"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${gate.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sheet-header">
            <h2>Edit gate</h2>
            <button type="button" className="link-button" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>
          </div>
          <GateEditForm
            name={gate.name}
            code={gate.code}
            notes={gate.notes}
            onSave={(changes) => {
              onUpdateGate(gate.id, changes)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    )
  }

  const visibleAddresses = showAllAddresses ? addresses : addresses.slice(0, ADDRESS_PREVIEW_COUNT)
  const hiddenAddressCount = addresses.length - ADDRESS_PREVIEW_COUNT

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={gate.name}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <h2>{gate.name}</h2>
          <button type="button" className="link-button" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <p className={flagged ? 'code code--lg code--flagged' : 'code code--lg'}>{gate.code}</p>
        {flagged && (
          <p className="chip error-chip">
            <WarningIcon />
            <span>Reported not working</span>
          </p>
        )}
        <p className="card-meta">
          {addresses.length} address{addresses.length === 1 ? '' : 'es'} · updated{' '}
          {new Date(gate.updatedAt).toLocaleDateString()}
        </p>

        {gate.notes && <p className="notes">{gate.notes}</p>}

        <hr className="hr" />

        <p className="card-kicker">Addresses</p>
        {addresses.length > 0 && (
          <ul className="address-list">
            {visibleAddresses.map((address) => (
              <li key={address.id}>
                {address.address}
                {address.notes && ` — ${address.notes}`}
                <DeleteButton
                  label="Delete address"
                  variant="icon"
                  onConfirm={() => onDeleteAddress(address.id)}
                />
              </li>
            ))}
          </ul>
        )}
        {!showAllAddresses && hiddenAddressCount > 0 && (
          <button
            type="button"
            className="link-button block-link"
            onClick={() => setShowAllAddresses(true)}
          >
            See all {addresses.length} addresses
          </button>
        )}
        <AddressForm gateId={gate.id} onAdd={onAddAddress} />

        <label className="flag-checkbox">
          <input
            type="checkbox"
            checked={flagged}
            onChange={() => (flagged ? onClearCodeFailed(gate.id) : onMarkCodeFailed(gate.id))}
          />
          Code not working
        </label>

        {gate.codeHistory.length > 0 && (
          <ul className="code-history">
            {gate.codeHistory.map((entry) => (
              <li key={entry.id}>
                Previously {entry.code} (until{' '}
                {new Date(entry.supersededAt).toLocaleDateString()})
              </li>
            ))}
          </ul>
        )}

        {gate.lat != null && gate.lng != null ? (
          <>
            {!editingLocation && (
              <button
                type="button"
                className="link-button"
                onClick={() => setEditingLocation(true)}
              >
                Adjust location on map
              </button>
            )}
            {editingLocation && (
              <>
                <GateLocationEditor
                  lat={gate.lat}
                  lng={gate.lng}
                  onUpdateLocation={(coords) => onUpdateLocation(gate.id, coords)}
                />
                <button
                  type="button"
                  className="btn-secondary btn-block"
                  onClick={() => setEditingLocation(false)}
                >
                  Done
                </button>
              </>
            )}
          </>
        ) : (
          <p className="location">No location recorded</p>
        )}

        <hr className="hr" />
        <div className="btn-row">
          {!deleteArmed && (
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <DeleteButton
            label="Delete gate"
            variant="outline"
            onConfirm={() => onDeleteGate(gate.id)}
            onArmedChange={setDeleteArmed}
          />
        </div>
      </div>
    </div>
  )
}
