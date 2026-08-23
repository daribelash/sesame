import { useState, type FormEvent } from 'react'
import { AuthError, login, register, type AuthUser } from './auth'
import { WarningIcon } from './icons'

export type AuthMode = 'login' | 'register'

interface AuthPanelProps {
  initialMode?: AuthMode
  /** Register success advances to the save-first-gate step; login success
   * skips straight to a "welcome back" confirmation — the caller routes
   * based on which mode was actually used. */
  onAuthenticated: (user: AuthUser, mode: AuthMode) => void
  onCancel: () => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Client-side pre-submit checks with the exact copy the design calls for —
 * catches the obvious cases before a network round-trip. A rejected login
 * (wrong credentials) still comes from the server's own AuthError below. */
function validate(email: string, password: string, mode: AuthMode): string | null {
  if (!email.trim() || !password) return 'Enter both an email and a password.'
  if (!EMAIL_PATTERN.test(email.trim())) return "That email address doesn't look right."
  if (mode === 'register' && password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  return null
}

export function AuthPanel({ initialMode = 'login', onAuthenticated, onCancel }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validate(email, password, mode)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const user = mode === 'login' ? await login(email, password) : await register(email, password)
      onAuthenticated(user, mode)
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-panel">
      <button type="button" className="link-button" onClick={onCancel}>
        ← Back
      </button>

      {mode === 'register' && <p className="step-label">Step 1 of 3</p>}
      <h1>{mode === 'login' ? 'Log in' : 'Create your account'}</h1>
      <p className="auth-subtitle">One login. Every gate code you save, wherever you next stand at it.</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="card elev-sm auth-fields">
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="chip error-chip">
              <WarningIcon />
              <span>{error}</span>
            </p>
          )}
        </div>

        <div className="splash-actions">
          <button type="submit" className="btn-block" disabled={submitting}>
            {mode === 'login' ? 'Log in' : 'Next'}
          </button>
          <button
            type="button"
            className="btn-ghost btn-block"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError(null)
            }}
          >
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
          </button>
        </div>
      </form>
    </div>
  )
}
