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
    ...overrides,
  }
}

describe('POST /api/gates then GET /api/gates', () => {
  it('round-trips a pushed gate back on pull', async () => {
    const app = buildApp(client)
    const { cookie } = await registerAndGetCookie(app, 'driver@example.com')
    const gate = makeClientGate()

    const pushResponse = await app.inject({
      method: 'POST',
      url: '/api/gates',
      headers: { cookie },
      payload: [gate],
    })
    expect(pushResponse.statusCode).toBe(200)

    const pullResponse = await app.inject({ method: 'GET', url: '/api/gates', headers: { cookie } })
    expect(pullResponse.statusCode).toBe(200)
    expect(pullResponse.json()).toEqual([gate])
  })

  it('accepts a gate saved without a GPS fix (lat/lng null)', async () => {
    const app = buildApp(client)
    const { cookie } = await registerAndGetCookie(app, 'driver@example.com')
    const gate = makeClientGate({ lat: null, lng: null, accuracy: null })

    const pushResponse = await app.inject({
      method: 'POST',
      url: '/api/gates',
      headers: { cookie },
      payload: [gate],
    })
    expect(pushResponse.statusCode).toBe(200)

    const pullResponse = await app.inject({ method: 'GET', url: '/api/gates', headers: { cookie } })
    expect(pullResponse.json()).toEqual([gate])
  })

  it('retains superseded codes rather than overwriting them', async () => {
    const app = buildApp(client)
    const { cookie } = await registerAndGetCookie(app, 'driver@example.com')
    const gate = makeClientGate({ code: '0451#' })

    await app.inject({ method: 'POST', url: '/api/gates', headers: { cookie }, payload: [gate] })

    const withHistory = {
      ...gate,
      code: '9999',
      updatedAt: new Date(Date.now() + 1000).toISOString(),
      codeHistory: [
        { id: randomUUID(), code: '0451#', supersededAt: new Date(Date.now() + 1000).toISOString() },
      ],
    }
    await app.inject({
      method: 'POST',
      url: '/api/gates',
      headers: { cookie },
      payload: [withHistory],
    })

    const pullResponse = await app.inject({ method: 'GET', url: '/api/gates', headers: { cookie } })
    const [pulled] = pullResponse.json() as { code: string; codeHistory: { code: string }[] }[]
    expect(pulled.code).toBe('9999')
    expect(pulled.codeHistory.map((entry) => entry.code)).toEqual(['0451#'])
  })

  it('upserts on a second push with the same id', async () => {
    const app = buildApp(client)
    const { cookie } = await registerAndGetCookie(app, 'driver@example.com')
    const gate = makeClientGate()

    await app.inject({ method: 'POST', url: '/api/gates', headers: { cookie }, payload: [gate] })

    const updated = { ...gate, code: '9999', updatedAt: new Date(Date.now() + 1000).toISOString() }
    await app.inject({ method: 'POST', url: '/api/gates', headers: { cookie }, payload: [updated] })

    const pullResponse = await app.inject({ method: 'GET', url: '/api/gates', headers: { cookie } })
    expect(pullResponse.json()).toEqual([updated])
  })

  it('401s without a session cookie', async () => {
    const app = buildApp(client)

    const response = await app.inject({ method: 'GET', url: '/api/gates' })

    expect(response.statusCode).toBe(401)
  })

  it("never returns another account's gates", async () => {
    const app = buildApp(client)
    const alice = await registerAndGetCookie(app, 'alice@example.com')
    const bob = await registerAndGetCookie(app, 'bob@example.com')

    await app.inject({
      method: 'POST',
      url: '/api/gates',
      headers: { cookie: alice.cookie },
      payload: [makeClientGate({ name: "Alice's gate" })],
    })

    const bobsView = await app.inject({ method: 'GET', url: '/api/gates', headers: { cookie: bob.cookie } })

    expect(bobsView.json()).toEqual([])
  })

  it("a pushed gate id colliding with another account's is silently ignored, not hijacked", async () => {
    const app = buildApp(client)
    const alice = await registerAndGetCookie(app, 'alice@example.com')
    const bob = await registerAndGetCookie(app, 'bob@example.com')

    const alicesGate = makeClientGate({ name: "Alice's gate" })
    await app.inject({
      method: 'POST',
      url: '/api/gates',
      headers: { cookie: alice.cookie },
      payload: [alicesGate],
    })

    // Bob pushes a gate with the same id as Alice's.
    await app.inject({
      method: 'POST',
      url: '/api/gates',
      headers: { cookie: bob.cookie },
      payload: [{ ...alicesGate, name: "Bob's hijack attempt" }],
    })

    const alicesView = await app.inject({
      method: 'GET',
      url: '/api/gates',
      headers: { cookie: alice.cookie },
    })
    expect(alicesView.json()).toEqual([alicesGate])

    const bobsView = await app.inject({ method: 'GET', url: '/api/gates', headers: { cookie: bob.cookie } })
    expect(bobsView.json()).toEqual([])
  })
})
