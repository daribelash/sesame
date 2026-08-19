import { useCallback, useEffect, useMemo, useState } from 'react'
import { GateForm } from './GateForm'
import { GateList } from './GateList'
import { RadiusFilter } from './RadiusFilter'
import { DataTools } from './DataTools'
import { AuthPanel } from './AuthPanel'
import { AccountBar } from './AccountBar'
import { AddressSearch } from './AddressSearch'
import { createGateRepository, type Gate, type NewGateInput } from './repository'
import {
  createAddressRepository,
  type Address,
  type NewAddressInput,
} from './addressRepository'
import { selectVisibleGates, RADIUS_OPTIONS_MILES } from './gateSort'
import { getCurrentFix } from './geolocation'
import { checkSession, getCachedUser, type AuthUser } from './auth'
import { syncAddresses, syncGates } from './sync'
import type { Coordinates } from './distance'
import './App.css'

type SyncStatus = 'idle' | 'syncing' | 'error'

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => getCachedUser())
  const [gates, setGates] = useState<Gate[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null)
  const [radiusMiles, setRadiusMiles] = useState<number>(RADIUS_OPTIONS_MILES[1])
  const [screen, setScreen] = useState<'app' | 'auth'>('app')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  // Gates and addresses are scoped per account (see CLAUDE.md), so both
  // repositories change whenever who's logged in changes.
  const gateRepo = useMemo(() => (user ? createGateRepository(user.id) : null), [user])
  const addressRepo = useMemo(() => (user ? createAddressRepository(user.id) : null), [user])

  useEffect(() => {
    setGates(gateRepo ? gateRepo.listGates() : [])
  }, [gateRepo])

  useEffect(() => {
    setAddresses(addressRepo ? addressRepo.listAddresses() : [])
  }, [addressRepo])

  const runSync = useCallback(async () => {
    if (!gateRepo || !addressRepo) return
    setSyncStatus('syncing')

    // Independent try/catches: a failed address sync must not hide an
    // otherwise-successful gate sync from the UI, or vice versa.
    let hadError = false

    try {
      await syncGates(gateRepo)
      setGates(gateRepo.listGates())
    } catch {
      hadError = true
    }

    try {
      await syncAddresses(addressRepo)
      setAddresses(addressRepo.listAddresses())
    } catch {
      hadError = true
    }

    // Invisible except for the subtle indicator — never blocks the UI
    // (CLAUDE.md: the UI never waits on the network).
    setSyncStatus(hadError ? 'error' : 'idle')
  }, [gateRepo, addressRepo])

  useEffect(() => {
    // Sync on login, and again whenever connectivity returns — covers the
    // "add a gate in airplane mode, regain signal" case without the UI ever
    // waiting on it.
    if (!gateRepo || !addressRepo) return
    runSync()
    window.addEventListener('online', runSync)
    return () => window.removeEventListener('online', runSync)
  }, [gateRepo, addressRepo, runSync])

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
    runSync()
  }

  function handleUpdateCode(gateId: string, newCode: string) {
    gateRepo?.updateGate(gateId, { code: newCode })
    refresh()
    runSync()
  }

  function handleAddAddress(input: NewAddressInput) {
    addressRepo?.createAddress(input)
    setAddresses(addressRepo ? addressRepo.listAddresses() : [])
    runSync()
  }

  const visibleGates = selectVisibleGates(gates, currentPosition, radiusMiles)

  const addressesByGate = useMemo(() => {
    const map = new Map<string, Address[]>()
    for (const address of addresses) {
      const existing = map.get(address.gateId)
      if (existing) {
        existing.push(address)
      } else {
        map.set(address.gateId, [address])
      }
    }
    return map
  }, [addresses])

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

  if (!user || !gateRepo || !addressRepo) {
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
      {syncStatus === 'syncing' && <p className="sync-status">Syncing…</p>}
      {syncStatus === 'error' && (
        <p className="sync-status sync-status--error">Sync paused — check your connection.</p>
      )}
      <AddressSearch addresses={addresses} gates={gates} />
      <GateForm onAdd={handleAdd} />
      <RadiusFilter value={radiusMiles} onChange={setRadiusMiles} />
      <GateList
        gates={visibleGates}
        addressesByGate={addressesByGate}
        onUpdateCode={handleUpdateCode}
        onAddAddress={handleAddAddress}
      />
      <DataTools repo={gateRepo} onImport={refresh} />
    </main>
  )
}

export default App
