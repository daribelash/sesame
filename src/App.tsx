import { useEffect, useMemo, useState } from 'react'
import { GateForm } from './GateForm'
import { GateList } from './GateList'
import { RadiusFilter } from './RadiusFilter'
import { DataTools } from './DataTools'
import { AuthPanel } from './AuthPanel'
import { AccountBar } from './AccountBar'
import { createGateRepository, type Gate, type NewGateInput } from './repository'
import { selectVisibleGates, RADIUS_OPTIONS_MILES } from './gateSort'
import { getCurrentFix } from './geolocation'
import { checkSession, getCachedUser, type AuthUser } from './auth'
import type { Coordinates } from './distance'
import './App.css'

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => getCachedUser())
  const [gates, setGates] = useState<Gate[]>([])
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null)
  const [radiusMiles, setRadiusMiles] = useState<number>(RADIUS_OPTIONS_MILES[1])
  const [screen, setScreen] = useState<'app' | 'auth'>('app')

  // Gates are scoped per account (see CLAUDE.md), so the repository itself
  // changes whenever who's logged in changes.
  const gateRepo = useMemo(() => (user ? createGateRepository(user.id) : null), [user])

  useEffect(() => {
    setGates(gateRepo ? gateRepo.listGates() : [])
  }, [gateRepo])

  useEffect(() => {
    getCurrentFix().then((result) => {
      if (result.status === 'success') {
        setCurrentPosition({ lat: result.fix.lat, lng: result.fix.lng })
      }
    })
  }, [])

  useEffect(() => {
    // Verifies the cached identity in the background. A confirmed 401 logs
    // the UI out; a network failure (offline) leaves the cached state as-is
    // — checking auth status must never block or override local-first use.
    checkSession().then((result) => {
      if (result.status === 'authenticated') setUser(result.user)
      else if (result.status === 'unauthenticated') setUser(null)
    })
  }, [])

  function refresh() {
    setGates(gateRepo ? gateRepo.listGates() : [])
  }

  function handleAdd(input: NewGateInput) {
    gateRepo?.createGate(input)
    refresh()
  }

  const visibleGates = selectVisibleGates(gates, currentPosition, radiusMiles)

  if (screen === 'auth') {
    return (
      <main>
        <h1>Sesame</h1>
        <AuthPanel
          onAuthenticated={(loggedInUser) => {
            setUser(loggedInUser)
            setScreen('app')
          }}
          onCancel={() => setScreen('app')}
        />
      </main>
    )
  }

  if (!user || !gateRepo) {
    return (
      <main>
        <h1>Sesame</h1>
        <p>Log in to see your saved gates.</p>
        <button type="button" onClick={() => setScreen('auth')}>
          Log in
        </button>
      </main>
    )
  }

  return (
    <main>
      <h1>Sesame</h1>
      <AccountBar user={user} onLoggedOut={() => setUser(null)} />
      <GateForm onAdd={handleAdd} />
      <RadiusFilter value={radiusMiles} onChange={setRadiusMiles} />
      <GateList gates={visibleGates} />
      <DataTools repo={gateRepo} onImport={refresh} />
    </main>
  )
}

export default App
