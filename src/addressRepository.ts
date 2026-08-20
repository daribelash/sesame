// Mirrors repository.ts's shape and local storage boundary. A separate
// module rather than a shared generic factory — the field shapes diverge
// enough (gateId, no lat/lng/code) that a generic would add more confusion
// than the ~50 lines of duplication it would save.

export interface Address {
  id: string
  gateId: string
  address: string
  notes: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type NewAddressInput = Pick<Address, 'gateId' | 'address' | 'notes'>
export type AddressUpdateInput = Partial<Pick<Address, 'address' | 'notes'>>

export interface AddressRepository {
  /** All non-deleted addresses, most recently created first. */
  listAddresses(): Address[]
  /** Non-deleted addresses for one gate. */
  listAddressesForGate(gateId: string): Address[]
  createAddress(input: NewAddressInput): Address
  updateAddress(id: string, changes: AddressUpdateInput): Address | undefined
  deleteAddress(id: string): void
  exportAddresses(): Address[]
  applyRemoteAddresses(addresses: Address[]): void
}

export function createAddressRepository(userId: string): AddressRepository {
  const storageKey = `sesame:addresses:${userId}`

  function readAll(): Address[] {
    const raw = localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as Address[]) : []
  }

  function writeAll(addresses: Address[]): void {
    localStorage.setItem(storageKey, JSON.stringify(addresses))
  }

  return {
    listAddresses() {
      return readAll()
        .filter((address) => address.deletedAt === null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    listAddressesForGate(gateId) {
      return this.listAddresses().filter((address) => address.gateId === gateId)
    },

    createAddress(input) {
      const now = new Date().toISOString()
      const address: Address = {
        id: crypto.randomUUID(),
        gateId: input.gateId,
        address: input.address,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }
      writeAll([...readAll(), address])
      return address
    },

    updateAddress(id, changes) {
      const addresses = readAll()
      const index = addresses.findIndex((address) => address.id === id)
      if (index === -1) return undefined

      const updated: Address = {
        ...addresses[index],
        ...changes,
        updatedAt: new Date().toISOString(),
      }
      addresses[index] = updated
      writeAll(addresses)
      return updated
    },

    deleteAddress(id) {
      const addresses = readAll()
      const index = addresses.findIndex((address) => address.id === id)
      if (index === -1) return

      const now = new Date().toISOString()
      addresses[index] = { ...addresses[index], deletedAt: now, updatedAt: now }
      writeAll(addresses)
    },

    exportAddresses() {
      return readAll()
    },

    applyRemoteAddresses(addresses) {
      const byId = new Map(readAll().map((address) => [address.id, address]))
      for (const address of addresses) {
        byId.set(address.id, address)
      }
      writeAll([...byId.values()])
    },
  }
}
