import { GateIcon, PinIcon, LockIcon, BuildingIcon } from './icons'

interface SplashScreenProps {
  onGetStarted: () => void
  onLogIn: () => void
}

export function SplashScreen({ onGetStarted, onLogIn }: SplashScreenProps) {
  return (
    <div className="splash">
      <div className="icon-badge">
        <GateIcon />
      </div>
      <div>
        <h1>Never dig for a gate code again.</h1>
        <p className="splash-body">
          Sesame remembers every code by the gate that owns it — and hands it back the moment
          you're standing there.
        </p>
      </div>
      <hr className="hr" />
      <ul className="splash-features">
        <li className="chip">
          <PinIcon />
          <span>Codes surface automatically by GPS proximity</span>
        </li>
        <li className="chip">
          <LockIcon />
          <span>Local-first — works fully offline</span>
        </li>
        <li className="chip">
          <BuildingIcon />
          <span>One gate, many addresses — one update</span>
        </li>
      </ul>
      <div className="splash-actions">
        <button type="button" className="btn-block" onClick={onGetStarted}>
          Get started
        </button>
        <button type="button" className="btn-ghost btn-block" onClick={onLogIn}>
          I already have an account
        </button>
      </div>
    </div>
  )
}
