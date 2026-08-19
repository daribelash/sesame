import { useState, type FormEvent } from 'react'
import { AuthError, login, register, type AuthUser } from './auth'

interface AuthPanelProps {
  onAuthenticated: (user: AuthUser) => void
  onCancel: () => void
}

export function AuthPanel({ onAuthenticated, onCancel }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const user =
        mode === 'login' ? await login(email, password) : await register(email, password)
      onAuthenticated(user)
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

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {mode === 'login' ? 'Log in' : 'Register'}
        </button>
      </form>

      <button
        type="button"
        className="link-button"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login')
          setError(null)
        }}
      >
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
      </button>
    </div>
  )
}
