// The only module allowed to touch localStorage. Everything else goes
// through these functions so the storage backend can change later
// (see CLAUDE.md: local storage boundary).

const STORAGE_KEY = 'sesame:gates'

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

function readAll(): Gate[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as Gate[]) : []
}

function writeAll(gates: Gate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gates))
}

/** All non-deleted gates, most recently created first. */
export function listGates(): Gate[] {
  return readAll()
    .filter((gate) => gate.deletedAt === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createGate(input: NewGateInput): Gate {
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
}

export function updateGate(id: string, changes: GateUpdateInput): Gate | undefined {
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
}

export function deleteGate(id: string): void {
  const gates = readAll()
  const index = gates.findIndex((gate) => gate.id === id)
  if (index === -1) return

  const now = new Date().toISOString()
  gates[index] = { ...gates[index], deletedAt: now, updatedAt: now }
  writeAll(gates)
}
