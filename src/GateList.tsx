import type { GateWithDistance } from './gateSort'
import type { Address } from './addressRepository'
import { GateCard } from './GateCard'

interface GateListProps {
  gates: GateWithDistance[]
  addressesByGate: Map<string, Address[]>
  onOpenDetail: (gateId: string) => void
}

export function GateList({ gates, addressesByGate, onOpenDetail }: GateListProps) {
  if (gates.length === 0) {
    return <p>No gates saved yet.</p>
  }

  return (
    <ul className="gate-list">
      {gates.map((gate) => (
        <GateCard
          key={gate.id}
          gate={gate}
          addressCount={(addressesByGate.get(gate.id) ?? []).length}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </ul>
  )
}
