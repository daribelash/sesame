import type { Address } from './addressRepository'

/** Case-insensitive substring match over the address text — for checking a
 * code before you arrive, not on the spot (CLAUDE.md). */
export function searchAddresses(addresses: Address[], query: string): Address[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []
  return addresses.filter((address) => address.address.toLowerCase().includes(trimmed))
}
