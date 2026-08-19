import { beforeEach, describe, expect, it } from 'vitest'
import { createAddressRepository } from './addressRepository'

const userId = 'user-1'

beforeEach(() => {
  localStorage.clear()
})

describe('createAddress', () => {
  it('persists an address with a generated id and timestamps', () => {
    const repo = createAddressRepository(userId)
    const address = repo.createAddress({
      gateId: 'gate-1',
      address: '123 Oak Lane',
      notes: 'beige house, side door',
    })

    expect(address.id).toBeTruthy()
    expect(address.gateId).toBe('gate-1')
    expect(address.address).toBe('123 Oak Lane')
    expect(address.notes).toBe('beige house, side door')
    expect(address.deletedAt).toBeNull()

    expect(repo.listAddresses()).toEqual([address])
  })
})

describe('listAddressesForGate', () => {
  it('returns only addresses belonging to that gate', () => {
    const repo = createAddressRepository(userId)
    const forGateA = repo.createAddress({ gateId: 'gate-a', address: '1 A St', notes: '' })
    repo.createAddress({ gateId: 'gate-b', address: '2 B St', notes: '' })

    expect(repo.listAddressesForGate('gate-a')).toEqual([forGateA])
  })
})

describe('updateAddress', () => {
  it('applies changes and bumps updatedAt', async () => {
    const repo = createAddressRepository(userId)
    const address = repo.createAddress({ gateId: 'gate-1', address: '123 Oak Lane', notes: '' })

    await new Promise((resolve) => setTimeout(resolve, 2))
    const updated = repo.updateAddress(address.id, { notes: 'gate code on the mailbox' })

    expect(updated?.notes).toBe('gate code on the mailbox')
    expect(updated?.updatedAt).not.toBe(address.updatedAt)
  })

  it('returns undefined for an id that does not exist', () => {
    expect(
      createAddressRepository(userId).updateAddress('missing-id', { notes: 'x' }),
    ).toBeUndefined()
  })
})

describe('deleteAddress', () => {
  it('soft-deletes so it stops appearing in reads', () => {
    const repo = createAddressRepository(userId)
    const address = repo.createAddress({ gateId: 'gate-1', address: '123 Oak Lane', notes: '' })

    repo.deleteAddress(address.id)

    expect(repo.listAddresses()).toEqual([])
  })
})

describe('applyRemoteAddresses', () => {
  it('upserts without touching addresses the server did not send', () => {
    const repo = createAddressRepository(userId)
    const untouched = repo.createAddress({ gateId: 'gate-1', address: 'Untouched', notes: '' })
    const existing = repo.createAddress({ gateId: 'gate-1', address: 'Old address', notes: '' })

    repo.applyRemoteAddresses([{ ...existing, address: 'New address from server' }])

    const addresses = repo.listAddresses()
    expect(addresses.find((a) => a.id === existing.id)?.address).toBe('New address from server')
    expect(addresses.find((a) => a.id === untouched.id)?.address).toBe('Untouched')
  })
})

describe('per-user isolation', () => {
  it('never shows one account addresses to another', () => {
    const repoA = createAddressRepository('user-a')
    const repoB = createAddressRepository('user-b')

    repoA.createAddress({ gateId: 'gate-1', address: "A's address", notes: '' })

    expect(repoA.listAddresses()).toHaveLength(1)
    expect(repoB.listAddresses()).toEqual([])
  })
})
