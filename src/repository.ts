// The only module allowed to touch localStorage. Everything else goes
// through these functions so the storage backend can change later
// (see CLAUDE.md: local storage boundary).
//
// Storage is scoped per authenticated user (sesame:gates:{userId}) so that
// logging out — or a different account logging in on the same device —
// never shows one account's gates to another.

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
}

export type NewGateInput = Pick<Gate, 'name' | 'code' | 'notes'> &
  Partial<Pick<Gate, 'lat' | 'lng' | 'accuracy'>>
export type GateUpdateInput = Partial<Pick<Gate, 'name' | 'code' | 'notes'>>

export interface GateRepository {
  /** All non-deleted gates, most recently created first. */
  listGates(): Gate[]
  createGate(input: NewGateInput): Gate
  updateGate(id: string, changes: GateUpdateInput): Gate | undefined
  deleteGate(id: string): void
  /** Every gate, including soft-deleted tombstones, for backup. */
  exportGates(): Gate[]
  /**
   * Restores from a backup, replacing this user's local store outright.
   * There is no sync yet, so there is no other copy to reconcile against —
   * this is a restore operation, not a merge.
   */
  importGates(gates: Gate[]): void
}

export function createGateRepository(userId: string): GateRepository {
  const storageKey = `sesame:gates:${userId}`

  function readAll(): Gate[] {
    const raw = localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as Gate[]) : []
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
      }
      writeAll([...readAll(), gate])
      return gate
    },

    updateGate(id, changes) {
      const gates = readAll()
      const index = gates.findIndex((gate) => gate.id === id)
      if (index === -1) return undefined

      const updated: Gate = {
        ...gates[index],
        ...changes,
        updatedAt: new Date().toISOString(),
      }
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

    importGates(gates) {
      writeAll(gates)
    },
  }
}
