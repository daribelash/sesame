import { randomUUID } from 'node:crypto'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { Pool, type PoolClient } from 'pg'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { SESSION_COOKIE } from './auth/middleware.js'
import { hashPassword } from './auth/password.js'
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

const credentials = { email: 'driver@example.com', password: 'correct horse battery staple' }

describe('POST /api/register', () => {
  it('creates a user, sets a session cookie, and returns the account', async () => {
    const app = buildApp(client)

    const response = await app.inject({ method: 'POST', url: '/api/register', payload: credentials })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({ id: expect.any(String), email: credentials.email })
    expect(response.cookies.some((c) => c.name === SESSION_COOKIE)).toBe(true)
  })

  it('rejects a duplicate email', async () => {
    const app = buildApp(client)
    await app.inject({ method: 'POST', url: '/api/register', payload: credentials })

    const response = await app.inject({ method: 'POST', url: '/api/register', payload: credentials })

    expect(response.statusCode).toBe(409)
  })

  it('rejects a password under 8 characters', async () => {
    const app = buildApp(client)

    const response = await app.inject({
      method: 'POST',
      url: '/api/register',
      payload: { email: 'a@example.com', password: 'short' },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/login', () => {
  async function insertUser() {
    const id = randomUUID()
    await client.query('insert into users (id, email, password_hash) values ($1, $2, $3)', [
      id,
      credentials.email,
      await hashPassword(credentials.password),
    ])
    return id
  }

  it('logs in with correct credentials and sets a session cookie', async () => {
    await insertUser()
    const app = buildApp(client)

    const response = await app.inject({ method: 'POST', url: '/api/login', payload: credentials })

    expect(response.statusCode).toBe(200)
    expect(response.cookies.some((c) => c.name === SESSION_COOKIE)).toBe(true)
  })

  it('rejects a wrong password', async () => {
    await insertUser()
    const app = buildApp(client)

    const response = await app.inject({
      method: 'POST',
      url: '/api/login',
      payload: { email: credentials.email, password: 'wrong password' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('rejects an email that was never registered', async () => {
    const app = buildApp(client)

    const response = await app.inject({ method: 'POST', url: '/api/login', payload: credentials })

    expect(response.statusCode).toBe(401)
  })
})

describe('GET /api/me', () => {
  it('returns the user for a valid session cookie', async () => {
    const app = buildApp(client)
    const registered = await app.inject({
      method: 'POST',
      url: '/api/register',
      payload: credentials,
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: sessionCookieHeader(registered) },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: registered.json().id, email: credentials.email })
  })

  it('401s with no cookie at all', async () => {
    const app = buildApp(client)

    const response = await app.inject({ method: 'GET', url: '/api/me' })

    expect(response.statusCode).toBe(401)
  })

  it('401s with a malformed session id', async () => {
    const app = buildApp(client)

    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: `${SESSION_COOKIE}=not-a-real-session` },
    })

    expect(response.statusCode).toBe(401)
  })

  it('401s with an expired session', async () => {
    const userId = randomUUID()
    await client.query('insert into users (id, email, password_hash) values ($1, $2, $3)', [
      userId,
      credentials.email,
      await hashPassword(credentials.password),
    ])
    const expiredSessionId = randomUUID()
    await client.query(
      "insert into sessions (id, user_id, expires_at) values ($1, $2, now() - interval '1 day')",
      [expiredSessionId, userId],
    )
    const app = buildApp(client)

    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: `${SESSION_COOKIE}=${expiredSessionId}` },
    })

    expect(response.statusCode).toBe(401)
  })
})

describe('POST /api/logout', () => {
  it('invalidates the session server-side', async () => {
    const app = buildApp(client)
    const registered = await app.inject({
      method: 'POST',
      url: '/api/register',
      payload: credentials,
    })
    const cookie = sessionCookieHeader(registered)

    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/api/logout',
      headers: { cookie },
    })
    expect(logoutResponse.statusCode).toBe(204)

    const meResponse = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } })
    expect(meResponse.statusCode).toBe(401)
  })
})
