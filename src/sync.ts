import type { Address, AddressRepository } from './addressRepository'
import { reconcile } from './reconciler'
import type { Gate, GateRepository } from './repository'

/**
 * Pushes local changes up and pulls remote changes down, once. The UI never
 * awaits this — it's a background concern, and a failure here (offline,
 * server unreachable) must never surface as anything more than the caller's
 * own status indicator (CLAUDE.md: sync failures are invisible except for a
 * subtle status indicator).
 */
export async function syncGates(repo: GateRepository): Promise<void> {
  const local = repo.exportGates()

  const pullResponse = await fetch('/api/gates', { credentials: 'same-origin' })
  if (!pullResponse.ok) throw new Error('Failed to pull gates from the server')
  const remote = (await pullResponse.json()) as Gate[]

  const { toPush, toApplyLocally } = reconcile(local, remote)

  if (toApplyLocally.length > 0) {
    repo.applyRemoteGates(toApplyLocally)
  }

  if (toPush.length > 0) {
    const pushResponse = await fetch('/api/gates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(toPush),
    })
    if (!pushResponse.ok) throw new Error('Failed to push gates to the server')
  }
}

/** Same shape as syncGates — see there for the rationale. */
export async function syncAddresses(repo: AddressRepository): Promise<void> {
  const local = repo.exportAddresses()

  const pullResponse = await fetch('/api/addresses', { credentials: 'same-origin' })
  if (!pullResponse.ok) throw new Error('Failed to pull addresses from the server')
  const remote = (await pullResponse.json()) as Address[]

  const { toPush, toApplyLocally } = reconcile(local, remote)

  if (toApplyLocally.length > 0) {
    repo.applyRemoteAddresses(toApplyLocally)
  }

  if (toPush.length > 0) {
    const pushResponse = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(toPush),
    })
    if (!pushResponse.ok) throw new Error('Failed to push addresses to the server')
  }
}
