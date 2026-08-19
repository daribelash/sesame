import type { GateWithDistance } from './gateSort'
import { UpdateCodeForm } from './UpdateCodeForm'
import { AddressForm } from './AddressForm'
import type { Address, NewAddressInput } from './addressRepository'

interface GateListProps {
  gates: GateWithDistance[]
  addressesByGate: Map<string, Address[]>
  onUpdateCode: (gateId: string, newCode: string) => void
  onAddAddress: (input: NewAddressInput) => void
}

export function GateList({ gates, addressesByGate, onUpdateCode, onAddAddress }: GateListProps) {
  if (gates.length === 0) {
    return <p>No gates saved yet.</p>
  }

  return (
    <ul className="gate-list">
      {gates.map((gate) => (
        <li key={gate.id} className="gate">
          <h2>{gate.name}</h2>
          <p className="code">{gate.code}</p>
          <UpdateCodeForm
            currentCode={gate.code}
            onSubmit={(newCode) => onUpdateCode(gate.id, newCode)}
          />
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
          {gate.notes && <p className="notes">{gate.notes}</p>}
          {gate.distanceMiles !== null && (
            <p className="distance">{gate.distanceMiles.toFixed(1)} mi away</p>
          )}
          {gate.lat != null && gate.lng != null ? (
            <p className="location">
              {gate.lat.toFixed(5)}, {gate.lng.toFixed(5)}
              {gate.accuracy != null && ` (±${Math.round(gate.accuracy)}m)`}
            </p>
          ) : (
            <p className="location">No location recorded</p>
          )}
          <p className="updated">
            Updated {new Date(gate.updatedAt).toLocaleDateString()}
          </p>

          {(addressesByGate.get(gate.id) ?? []).length > 0 && (
            <ul className="address-list">
              {(addressesByGate.get(gate.id) ?? []).map((address) => (
                <li key={address.id}>
                  {address.address}
                  {address.notes && ` — ${address.notes}`}
                </li>
              ))}
            </ul>
          )}
          <AddressForm gateId={gate.id} onAdd={onAddAddress} />
        </li>
      ))}
    </ul>
  )
}
