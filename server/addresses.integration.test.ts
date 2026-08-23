import { randomUUID } from 'node:crypto'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { Pool, type PoolClient } from 'pg'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { SESSION_COOKIE } from './auth/middleware.js'
import { migrate } from './migrate.js'

let container: StartedPostgreSqlContainer
let pool: Pool
let client: PoolClient

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17').start()
  pool = new Pool({ connectionString: container.getConnectionUri() })
  await migrate(pool)
}, 60_000)

afterAll(async () => {
  await pool.end()
  await container.stop()
})

beforeEach(async () => {
  client = await pool.connect()
  await client.query('begin')
})

afterEach(async () => {
  await client.query('rollback')
  client.release()
})

function sessionCookieHeader(response: { cookies: { name: string; value: string }[] }): string {
  const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE)
  if (!cookie) throw new Error('Response did not set a session cookie')
  return `${cookie.name}=${cookie.value}`
}

async function registerAndGetCookie(app: ReturnType<typeof buildApp>, email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/register',
    payload: { email, password: 'correct horse battery staple' },
  })
  return { cookie: sessionCookieHeader(response), userId: response.json().id as string }
}

function makeClientGate(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    name: 'Oakwood Estates',
    code: '0451#',
    notes: '',
    lat: 32.7767,
    lng: -96.797,
    accuracy: 10,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    codeHistory: [],
    failedAt: null,
    ...overrides,
  }
}

function makeClientAddress(gateId: string, overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    gateId,
    address: '123 Oak Lane',
    notes: '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

describe('POST /api/addresses then GET /api/addresses', () => {
  it('round-trips a pushed address, joined through its gate', async () => {
    const app = buildApp(client)
    const { cookie } = await registerAndGetCookie(app, 'driver@example.com')
    const gate = makeClientGate()
    await app.inject({ method: 'POST', url: '/api/gates', headers: { cookie }, payload: [gate] })
    const address = makeClientAddress(gate.id)

    const pushResponse = await app.inject({
      method: 'POST',
      url: '/api/addresses',
      headers: { cookie },
      payload: [address],
    })
    expect(pushResponse.statusCode).toBe(200)

    const pullResponse = await app.inject({
      method: 'GET',
      url: '/api/addresses',
      headers: { cookie },
    })
    expect(pullResponse.json()).toEqual([address])
  })

  it('401s without a session cookie', async () => {
    const app = buildApp(client)

    const response = await app.inject({ method: 'GET', url: '/api/addresses' })

    expect(response.statusCode).toBe(401)
  })

  it("never returns another account's addresses, even via the gate join", async () => {
    const app = buildApp(client)
    const alice = await registerAndGetCookie(app, 'alice@example.com')
    const bob = await registerAndGetCookie(app, 'bob@example.com')

    const alicesGate = makeClientGate()
    await app.inject({
      method: 'POST',
      url: '/api/gates',
      headers: { cookie: alice.cookie },
      payload: [alicesGate],
    })
    await app.inject({
      method: 'POST',
      url: '/api/addresses',
      headers: { cookie: alice.cookie },
      payload: [makeClientAddress(alicesGate.id)],
    })

    const bobsView = await app.inject({
      method: 'GET',
      url: '/api/addresses',
      headers: { cookie: bob.cookie },
    })

    expect(bobsView.json()).toEqual([])
  })

  it("does not attach an address to a gate the pusher does not own", async () => {
    const app = buildApp(client)
    const alice = await registerAndGetCookie(app, 'alice@example.com')
    const bob = await registerAndGetCookie(app, 'bob@example.com')

    const alicesGate = makeClientGate()
    await app.inject({
      method: 'POST',
      url: '/api/gates',
      headers: { cookie: alice.cookie },
      payload: [alicesGate],
    })

    // Bob tries to attach an address to Alice's gate.
    await app.inject({
      method: 'POST',
      url: '/api/addresses',
      headers: { cookie: bob.cookie },
      payload: [makeClientAddress(alicesGate.id)],
    })

    const alicesView = await app.inject({
      method: 'GET',
      url: '/api/addresses',
      headers: { cookie: alice.cookie },
    })
    const bobsView = await app.inject({
      method: 'GET',
      url: '/api/addresses',
      headers: { cookie: bob.cookie },
    })
    expect(alicesView.json()).toEqual([])
    expect(bobsView.json()).toEqual([])
  })
})
