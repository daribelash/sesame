// The only module allowed to touch localStorage. Everything else goes
// through these functions so the storage backend can change later
// (see CLAUDE.md: local storage boundary).
//
// Storage is scoped per authenticated user (sesame:gates:{userId}) so that
// logging out — or a different account logging in on the same device —
// never shows one account's gates to another.

export interface CodeHistoryEntry {
  id: string
  code: string
  /** When this code stopped being current — the previous one is often
   * still live for a while after a community rotates it. */
  supersededAt: string
}

export interface Gate {
  id: string
  name: string
  code: string
  notes: string
  lat: number | null
  lng: number | null
  accuracy: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  /** Newest first. Superseded codes are kept, never overwritten. */
  codeHistory: CodeHistoryEntry[]
  /** When this gate's current code was flagged as not working, or null if
   * it isn't flagged. Cleared automatically whenever the code next changes. */
  failedAt: string | null
}

export type NewGateInput = Pick<Gate, 'name' | 'code' | 'notes'> &
  Partial<Pick<Gate, 'lat' | 'lng' | 'accuracy'>>
export type GateUpdateInput = Partial<
  Pick<Gate, 'name' | 'code' | 'notes' | 'lat' | 'lng' | 'accuracy'>
>

export interface GateRepository {
  /** All non-deleted gates, most recently created first. */
  listGates(): Gate[]
  createGate(input: NewGateInput): Gate
  updateGate(id: string, changes: GateUpdateInput): Gate | undefined
  /** Flags the gate's current code as not working. Cleared automatically the
   * next time the code changes via updateGate. */
  markCodeFailed(id: string): Gate | undefined
  /** Clears the flag directly — the code turned out fine after all, or it
   * was flagged by mistake. */
  clearCodeFailed(id: string): Gate | undefined
  deleteGate(id: string): void
  /** Every gate, including soft-deleted tombstones — used by sync to reconcile. */
  exportGates(): Gate[]
  /**
   * Upserts gates from the server into the existing local store — a merge,
   * not a replace. Used by sync to apply the reconciler's toApplyLocally
   * without touching gates the server didn't send back.
   */
  applyRemoteGates(gates: Gate[]): void
}

export function createGateRepository(userId: string): GateRepository {
  const storageKey = `sesame:gates:${userId}`

  function readAll(): Gate[] {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []

    // Gates saved before codeHistory existed on the schema don't have it —
    // normalize here so every caller can trust the shape, rather than every
    // reader needing to guard against a stale local record.
    const parsed = JSON.parse(raw) as Gate[]
    return parsed.map((gate) => ({
      ...gate,
      codeHistory: gate.codeHistory ?? [],
      failedAt: gate.failedAt ?? null,
    }))
  }

  function writeAll(gates: Gate[]): void {
    localStorage.setItem(storageKey, JSON.stringify(gates))
  }

  return {
    listGates() {
      return readAll()
        .filter((gate) => gate.deletedAt === null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    createGate(input) {
      const now = new Date().toISOString()
      const gate: Gate = {
        id: crypto.randomUUID(),
        name: input.name,
        code: input.code,
        notes: input.notes,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        accuracy: input.accuracy ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        codeHistory: [],
        failedAt: null,
      }
      writeAll([...readAll(), gate])
      return gate
    },

    updateGate(id, changes) {
      const gates = readAll()
      const index = gates.findIndex((gate) => gate.id === id)
      if (index === -1) return undefined

      const existing = gates[index]
      const now = new Date().toISOString()
      const codeChanged = changes.code !== undefined && changes.code !== existing.code

      const updated: Gate = {
        ...existing,
        ...changes,
        codeHistory: codeChanged
          ? [
              { id: crypto.randomUUID(), code: existing.code, supersededAt: now },
              ...existing.codeHistory,
            ]
          : existing.codeHistory,
        // A code change means whatever "not working" state applied to the old
        // code no longer means anything — clear it rather than carry a stale
        // flag forward onto a code that's never been tried.
        failedAt: codeChanged ? null : existing.failedAt,
        updatedAt: now,
      }
      gates[index] = updated
      writeAll(gates)
      return updated
    },

    markCodeFailed(id) {
      const gates = readAll()
      const index = gates.findIndex((gate) => gate.id === id)
      if (index === -1) return undefined

      const now = new Date().toISOString()
      const updated: Gate = { ...gates[index], failedAt: now, updatedAt: now }
      gates[index] = updated
      writeAll(gates)
      return updated
    },

    clearCodeFailed(id) {
      const gates = readAll()
      const index = gates.findIndex((gate) => gate.id === id)
      if (index === -1) return undefined

      const now = new Date().toISOString()
      const updated: Gate = { ...gates[index], failedAt: null, updatedAt: now }
      gates[index] = updated
      writeAll(gates)
      return updated
    },

    deleteGate(id) {
      const gates = readAll()
      const index = gates.findIndex((gate) => gate.id === id)
      if (index === -1) return

      const now = new Date().toISOString()
      gates[index] = { ...gates[index], deletedAt: now, updatedAt: now }
      writeAll(gates)
    },

    exportGates() {
      return readAll()
    },

    applyRemoteGates(gates) {
      const byId = new Map(readAll().map((gate) => [gate.id, gate]))
      for (const gate of gates) {
        byId.set(gate.id, gate)
      }
      writeAll([...byId.values()])
    },
  }
}
