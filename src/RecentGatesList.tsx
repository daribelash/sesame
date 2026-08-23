import type { GateWithDistance } from './gateSort'

interface RecentGatesListProps {
  title: string
  gates: GateWithDistance[]
  /** Show the created-at date+time — used for the "recently added" group,
   * not the "nearby" one. */
  showCreatedAt?: boolean
}

// Flat, non-expanding rows — a quick glance, not the full detail sheet.
// Reused for both the "Nearby" and "Recently added" main-page groups since
// the row shape is identical.
export function RecentGatesList({ title, gates, showCreatedAt = false }: RecentGatesListProps) {
  if (gates.length === 0) return null

  return (
    <div className="gate-snapshot">
      <p className="search-group-label">{title}</p>
      <ul className="gate-snapshot-list">
        {gates.map((gate) => (
          <li key={gate.id}>
            <span className="gate-snapshot-name">{gate.name}</span>
            <span className="code">{gate.code}</span>
            {gate.distanceMiles !== null && (
              <span className="distance">{gate.distanceMiles.toFixed(1)} mi</span>
            )}
            {showCreatedAt && (
              <span className="gate-snapshot-meta">
                {new Date(gate.createdAt).toLocaleString()}
              </span>
            )}
            {gate.notes && <span className="notes">{gate.notes}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
