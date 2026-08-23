import type { GateWithDistance } from './gateSort'
import type { Address } from './addressRepository'

interface RecentGatesListProps {
  title: string
  gates: GateWithDistance[]
  /** Show the created-at date+time — used for the "recently added" group,
   * not the "nearby" one. */
  showCreatedAt?: boolean
  onOpenDetail: (gateId: string) => void
  /** 'flat' (default) is a quick-glance text row. 'card' renders each gate
   * like a compact version of a full gate card — name, distance, large
   * code, address count — for the "Nearby" group, the closest thing to a
   * primary gate list this home screen still has. */
  variant?: 'flat' | 'card'
  /** Only needed for the 'card' variant's address-count line. */
  addressesByGate?: Map<string, Address[]>
}

// Reused for both the "Nearby" and "Recently added" main-page groups — each
// row opens the full detail sheet on tap, same as a search result or a map
// pin, whichever variant is used.
export function RecentGatesList({
  title,
  gates,
  showCreatedAt = false,
  onOpenDetail,
  variant = 'flat',
  addressesByGate,
}: RecentGatesListProps) {
  if (gates.length === 0) return null

  return (
    <div className={`gate-snapshot gate-snapshot--${variant}`}>
      <p className="search-group-label">{title}</p>
      <ul className="gate-snapshot-list">
        {gates.map((gate) => {
          const flagged = gate.failedAt != null

          return (
            <li key={gate.id}>
              <button
                type="button"
                className="search-result"
                aria-label={`Open ${gate.name}`}
                onClick={() => onOpenDetail(gate.id)}
              >
                {variant === 'card' ? (
                  <GateCardRow gate={gate} flagged={flagged} addressesByGate={addressesByGate} />
                ) : (
                  <>
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
                  </>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function GateCardRow({
  gate,
  flagged,
  addressesByGate,
}: {
  gate: GateWithDistance
  flagged: boolean
  addressesByGate?: Map<string, Address[]>
}) {
  const addressCount = addressesByGate?.get(gate.id)?.length ?? 0

  return (
    <>
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
    </>
  )
}
