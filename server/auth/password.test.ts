// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password.js'

describe('hashPassword/verifyPassword', () => {
  it('hashes to something other than the plaintext, tagged as argon2id', async () => {
    const hash = await hashPassword('correct horse battery staple')

    expect(hash).not.toBe('correct horse battery staple')
    expect(hash).toMatch(/^\$argon2id\$/)
  })

  it('verifies the correct password against its hash', async () => {
    const hash = await hashPassword('correct horse battery staple')

    expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple')

    expect(await verifyPassword(hash, 'wrong password')).toBe(false)
  })

  it('produces a different hash each time (random salt)', async () => {
    const first = await hashPassword('correct horse battery staple')
    const second = await hashPassword('correct horse battery staple')

    expect(first).not.toBe(second)
  })
})
