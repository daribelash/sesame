import type { Gate } from './repository'

export interface ReconcileResult {
  /** Local gates the server hasn't seen, or has an older version of. */
  toPush: Gate[]
  /** Remote gates missing locally, or newer than the local copy. */
  toApplyLocally: Gate[]
}

/**
 * Last-write-wins on updated_at, applied uniformly per gate id — no special
 * casing for deletes vs edits. A tombstone is just a gate whose updatedAt
 * happens to be a delete; whichever side has the later timestamp wins,
 * whether that's an edit resurrecting a remotely-deleted gate or a delete
 * overwriting a local edit. This is the highest-risk logic in the codebase
 * (CLAUDE.md) — keep it this simple on purpose.
 */
export function reconcile(localGates: Gate[], remoteGates: Gate[]): ReconcileResult {
  const localById = new Map(localGates.map((gate) => [gate.id, gate]))
  const remoteById = new Map(remoteGates.map((gate) => [gate.id, gate]))
  const allIds = new Set([...localById.keys(), ...remoteById.keys()])

  const toPush: Gate[] = []
  const toApplyLocally: Gate[] = []

  for (const id of allIds) {
    const local = localById.get(id)
    const remote = remoteById.get(id)

    if (local && !remote) {
      toPush.push(local)
    } else if (remote && !local) {
      toApplyLocally.push(remote)
    } else if (local && remote) {
      if (local.updatedAt > remote.updatedAt) {
        toPush.push(local)
      } else if (remote.updatedAt > local.updatedAt) {
        toApplyLocally.push(remote)
      }
      // Equal updatedAt: already in sync, nothing to do either direction.
    }
  }

  return { toPush, toApplyLocally }
}
