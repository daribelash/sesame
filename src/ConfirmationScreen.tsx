import { CheckIcon, PinIcon, LockIcon } from './icons'

interface ConfirmationScreenProps {
  variant: 'saved' | 'skipped' | 'welcome-back'
  gate?: { name: string; code: string } | null
  onContinue: () => void
}

const HEADLINES: Record<ConfirmationScreenProps['variant'], string> = {
  saved: "You're all set.",
  skipped: "You're all set.",
  'welcome-back': 'Welcome back.',
}

// Step 3 of 3 for a fresh registration (saved or skipped), and also the
// landing moment for a returning login — same shell, different copy.
export function ConfirmationScreen({ variant, gate, onContinue }: ConfirmationScreenProps) {
  return (
    <div className="confirmation">
      <div className="icon-badge">
        <CheckIcon />
      </div>
      <h1>{HEADLINES[variant]}</h1>

      {variant === 'saved' && gate && (
        <>
          <div className="gate-summary-card">
            <p className="gate-summary-kicker">{gate.name}</p>
            <p className="code">{gate.code}</p>
            <p className="chip gate-summary-meta">
              <PinIcon size={13} />
              <span>saved just now</span>
            </p>
          </div>
          <p className="chip">
            <LockIcon />
            <span className="sync-chip">Saved locally — synced next time you're online</span>
          </p>
        </>
      )}

      {variant === 'skipped' && <p>Add a gate whenever you're ready.</p>}
      {variant === 'welcome-back' && <p>Your gates are right where you left them.</p>}

      <button type="button" className="btn-block" onClick={onContinue}>
        Enter Sesame
      </button>
    </div>
  )
}
