import type { Gate } from './repository'

/** Case-insensitive substring match over the gate name — mirrors
 * searchAddresses, for checking a code before you arrive. */
export function searchGates(gates: Gate[], query: string): Gate[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []
  return gates.filter((gate) => gate.name.toLowerCase().includes(trimmed))
}
