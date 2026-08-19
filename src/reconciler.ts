export interface Syncable {
  id: string
  updatedAt: string
}

export interface ReconcileResult<T> {
  /** Local records the server hasn't seen, or has an older version of. */
  toPush: T[]
  /** Remote records missing locally, or newer than the local copy. */
  toApplyLocally: T[]
}

/**
 * Last-write-wins on updatedAt, applied uniformly per record id — no special
 * casing for deletes vs edits. A tombstone is just a record whose updatedAt
 * happens to be a delete; whichever side has the later timestamp wins,
 * whether that's an edit resurrecting a remotely-deleted record or a delete
 * overwriting a local edit. This is the highest-risk logic in the codebase
 * (CLAUDE.md) — keep it this simple on purpose. Generic so gates and
 * addresses share the exact same, exhaustively tested algorithm.
 */
export function reconcile<T extends Syncable>(local: T[], remote: T[]): ReconcileResult<T> {
  const localById = new Map(local.map((record) => [record.id, record]))
  const remoteById = new Map(remote.map((record) => [record.id, record]))
  const allIds = new Set([...localById.keys(), ...remoteById.keys()])

  const toPush: T[] = []
  const toApplyLocally: T[] = []

  for (const id of allIds) {
    const localRecord = localById.get(id)
    const remoteRecord = remoteById.get(id)

    if (localRecord && !remoteRecord) {
      toPush.push(localRecord)
    } else if (remoteRecord && !localRecord) {
      toApplyLocally.push(remoteRecord)
    } else if (localRecord && remoteRecord) {
      if (localRecord.updatedAt > remoteRecord.updatedAt) {
        toPush.push(localRecord)
      } else if (remoteRecord.updatedAt > localRecord.updatedAt) {
        toApplyLocally.push(remoteRecord)
      }
      // Equal updatedAt: already in sync, nothing to do either direction.
    }
  }

  return { toPush, toApplyLocally }
}
