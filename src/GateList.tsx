import type { Gate } from './repository'

interface GateListProps {
  gates: Gate[]
}

export function GateList({ gates }: GateListProps) {
  if (gates.length === 0) {
    return <p>No gates saved yet.</p>
  }

  return (
    <ul className="gate-list">
      {gates.map((gate) => (
        <li key={gate.id} className="gate">
          <h2>{gate.name}</h2>
          <p className="code">{gate.code}</p>
          {gate.notes && <p className="notes">{gate.notes}</p>}
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
        </li>
      ))}
    </ul>
  )
}
