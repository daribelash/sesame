import type { GateWithDistance } from './gateSort'
import { WarningIcon } from './icons'

interface GateCardProps {
  gate: GateWithDistance
  addressCount: number
  onOpenDetail: (gateId: string) => void
}

// The compact, always-visible list row — tapping it opens the full detail
// sheet (GateDetailSheet). No inline Details/Edit/Delete row here; those
// live in the sheet, so the list stays scannable.
export function GateCard({ gate, addressCount, onOpenDetail }: GateCardProps) {
  const flagged = gate.failedAt != null

  return (
    <li>
      <button
        type="button"
        className="gate-card"
        aria-label={`Open ${gate.name}`}
        onClick={() => onOpenDetail(gate.id)}
      >
        <div className="gate-card-header">
          <h2>{gate.name}</h2>
          {gate.distanceMiles !== null && (
            <span className="distance">{gate.distanceMiles.toFixed(1)} mi</span>
          )}
        </div>
        <p className={flagged ? 'code code--flagged' : 'code'}>{gate.code}</p>
        <p className="gate-card-meta">
          {addressCount} address{addressCount === 1 ? '' : 'es'} · updated{' '}
          {new Date(gate.updatedAt).toLocaleDateString()}
        </p>
        {flagged && (
          <span className="chip failed-badge">
            <WarningIcon size={13} />
            <span>Reported not working</span>
          </span>
        )}
      </button>
    </li>
  )
}
