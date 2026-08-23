import { useCallback, useEffect, useMemo, useState } from 'react'
import { GateList } from './GateList'
import { GateDetailSheet } from './GateDetailSheet'
import type { GateEditChanges } from './GateEditForm'
import { AddGateSheet } from './AddGateSheet'
import { RadiusFilter } from './RadiusFilter'
import { AuthPanel, type AuthMode } from './AuthPanel'
import { SplashScreen } from './SplashScreen'
import { SaveFirstGateStep } from './SaveFirstGateStep'
import { ConfirmationScreen } from './ConfirmationScreen'
import { KebabMenu } from './KebabMenu'
import { GateMap } from './GateMap'
import { MapErrorBoundary } from './MapErrorBoundary'
import { GateSearch } from './GateSearch'
import { createGateRepository, type Gate, type NewGateInput } from './repository'
import {
  createAddressRepository,
  type Address,
  type NewAddressInput,
} from './addressRepository'
import {
  selectVisibleGates,
  selectClosestGates,
  selectRecentGates,
  annotateWithDistance,
  RADIUS_OPTIONS_MILES,
} from './gateSort'
import { RecentGatesList } from './RecentGatesList'
import { getCurrentFix } from './geolocation'
import { checkSession, getCachedUser, type AuthUser } from './auth'
import { syncAddresses, syncGates } from './sync'
import type { Coordinates } from './distance'
import './App.css'

type SyncStatus = 'idle' | 'syncing' | 'error'
type Screen = 'splash' | 'auth' | 'save-gate' | 'confirmation' | 'home'

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => getCachedUser())
  const [gates, setGates] = useState<Gate[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null)
  const [radiusMiles, setRadiusMiles] = useState<number>(RADIUS_OPTIONS_MILES[1])
  // A returning user with a cached identity skips the first-run sequence
  // entirely and lands straight on the home screen.
  const [screen, setScreen] = useState<Screen>(() => (getCachedUser() ? 'home' : 'splash'))
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [gateStatus, setGateStatus] = useState<'saved' | 'skipped' | null>(null)
  const [savedFirstGate, setSavedFirstGate] = useState<Gate | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [activeGateId, setActiveGateId] = useState<string | null>(null)
  const [showAddGate, setShowAddGate] = useState(false)
  const [mapCreateAt, setMapCreateAt] = useState<Coordinates | null>(null)

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
      if (result.status === 'authenticated') {
        // The server confirms a valid session even without a local cache
        // (e.g. storage was cleared) — that's a "restore," not a first run,
        // so skip straight past the onboarding sequence.
        setUser(result.user)
        setScreen('home')
      } else if (result.status === 'unauthenticated') {
        setUser(null)
        setScreen('splash')
      }
    })
  }, [])

  function refresh() {
    setGates(gateRepo ? gateRepo.listGates() : [])
  }

  function handleAdd(input: NewGateInput, address?: string) {
    const gate = gateRepo?.createGate(input)
    if (gate && address) {
      addressRepo?.createAddress({ gateId: gate.id, address, notes: '' })
      setAddresses(addressRepo ? addressRepo.listAddresses() : [])
    }
    refresh()
    runSync()
  }

  function handleSaveFirstGate(input: NewGateInput) {
    const gate = gateRepo?.createGate(input) ?? null
    refresh()
    runSync()
    setSavedFirstGate(gate)
    setGateStatus('saved')
    setScreen('confirmation')
  }

  function handleSkipFirstGate() {
    setGateStatus('skipped')
    setScreen('confirmation')
  }

  function handleUpdateGate(gateId: string, changes: GateEditChanges) {
    gateRepo?.updateGate(gateId, changes)
    refresh()
    runSync()
  }

  function handleMarkCodeFailed(gateId: string) {
    gateRepo?.markCodeFailed(gateId)
    refresh()
    runSync()
  }

  function handleClearCodeFailed(gateId: string) {
    gateRepo?.clearCodeFailed(gateId)
    refresh()
    runSync()
  }

  function handleDeleteGate(gateId: string) {
    gateRepo?.deleteGate(gateId)
    refresh()
    runSync()
    setActiveGateId(null)
  }

  function handleAddAddress(input: NewAddressInput) {
    addressRepo?.createAddress(input)
    setAddresses(addressRepo ? addressRepo.listAddresses() : [])
    runSync()
  }

  function handleDeleteAddress(addressId: string) {
    addressRepo?.deleteAddress(addressId)
    setAddresses(addressRepo ? addressRepo.listAddresses() : [])
    runSync()
  }

  function handleUpdateLocation(gateId: string, coords: Coordinates) {
    // No longer a GPS-derived figure once manually corrected, so clear
    // accuracy rather than carry forward a reading that no longer applies.
    gateRepo?.updateGate(gateId, { lat: coords.lat, lng: coords.lng, accuracy: null })
    refresh()
    runSync()
  }

  const visibleGates = selectVisibleGates(gates, currentPosition, radiusMiles)
  const closestGates = selectClosestGates(gates, currentPosition)
  const recentGates = selectRecentGates(gates, currentPosition)
  // Resolved from the full gate list, not the radius-filtered visibleGates —
  // a gate opened from search, the map, or a snapshot card might not be in
  // the currently-visible radius-filtered set.
  const activeGateRaw = activeGateId ? gates.find((gate) => gate.id === activeGateId) : undefined
  const activeGate = activeGateRaw ? annotateWithDistance(activeGateRaw, currentPosition) : undefined

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

  if (screen === 'splash') {
    return (
      <main>
        <p className="wordmark">SESAME</p>
        <SplashScreen
          onGetStarted={() => {
            setAuthMode('register')
            setScreen('auth')
          }}
          onLogIn={() => {
            setAuthMode('login')
            setScreen('auth')
          }}
        />
      </main>
    )
  }

  if (screen === 'auth') {
    return (
      <main>
        <p className="wordmark">SESAME</p>
        <AuthPanel
          initialMode={authMode}
          onAuthenticated={(loggedInUser, mode) => {
            setUser(loggedInUser)
            setAuthMode(mode)
            setScreen(mode === 'register' ? 'save-gate' : 'confirmation')
          }}
          onCancel={() => setScreen('splash')}
        />
      </main>
    )
  }

  if (screen === 'save-gate') {
    return (
      <main>
        <p className="wordmark">SESAME</p>
        <SaveFirstGateStep onSave={handleSaveFirstGate} onSkip={handleSkipFirstGate} />
      </main>
    )
  }

  if (screen === 'confirmation') {
    return (
      <main>
        <p className="wordmark">SESAME</p>
        <ConfirmationScreen
          variant={authMode === 'login' ? 'welcome-back' : gateStatus === 'saved' ? 'saved' : 'skipped'}
          gate={savedFirstGate}
          onContinue={() => setScreen('home')}
        />
      </main>
    )
  }

  if (!user || !gateRepo || !addressRepo) {
    return (
      <main>
        <p className="wordmark">SESAME</p>
        <p>Log in to see your saved gates.</p>
        <button type="button" onClick={() => setScreen('splash')}>
          Log in
        </button>
      </main>
    )
  }

  return (
    <main>
      <p className="wordmark">SESAME</p>
      <div className="home-header">
        <div>
          <h2>Your gates</h2>
          {syncStatus === 'syncing' && <p className="sync-status">Syncing…</p>}
          {syncStatus === 'error' && (
            <p className="sync-status sync-status--error">Sync paused — check your connection.</p>
          )}
          {syncStatus === 'idle' && <p className="sync-status">Synced just now</p>}
        </div>
        <KebabMenu
          onLoggedOut={() => {
            setUser(null)
            setScreen('splash')
          }}
        />
      </div>
      <GateSearch gates={gates} addresses={addresses} onOpenGate={setActiveGateId} />
      <button
        type="button"
        onClick={() => {
          setMapCreateAt(null)
          setShowAddGate(true)
        }}
      >
        + Add gate
      </button>
      <div className="map-card">
        <p className="search-group-label">Map view</p>
        <MapErrorBoundary>
          <GateMap
            gates={gates}
            onOpenDetail={setActiveGateId}
            onCreateGateAt={(coords) => {
              setMapCreateAt(coords)
              setShowAddGate(true)
            }}
          />
        </MapErrorBoundary>
      </div>
      <RadiusFilter value={radiusMiles} onChange={setRadiusMiles} />
      <GateList
        gates={visibleGates}
        addressesByGate={addressesByGate}
        onOpenDetail={setActiveGateId}
      />
      <RecentGatesList title="Nearby" gates={closestGates} />
      <RecentGatesList title="Recently added" gates={recentGates} showCreatedAt />
      {showAddGate && (
        <AddGateSheet
          onAdd={handleAdd}
          onClose={() => {
            setShowAddGate(false)
            setMapCreateAt(null)
          }}
          initialCoordinates={mapCreateAt ?? undefined}
        />
      )}
      {activeGate && (
        <GateDetailSheet
          gate={activeGate}
          addresses={addressesByGate.get(activeGate.id) ?? []}
          onClose={() => setActiveGateId(null)}
          onUpdateGate={handleUpdateGate}
          onAddAddress={handleAddAddress}
          onMarkCodeFailed={handleMarkCodeFailed}
          onClearCodeFailed={handleClearCodeFailed}
          onDeleteGate={handleDeleteGate}
          onDeleteAddress={handleDeleteAddress}
          onUpdateLocation={handleUpdateLocation}
        />
      )}
    </main>
  )
}

export default App
