import { randomUUID } from 'node:crypto'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { Pool, type PoolClient } from 'pg'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
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

// Each test gets its own transaction, rolled back afterwards, so tests
// never see each other's data without needing to recreate the schema.
beforeEach(async () => {
  client = await pool.connect()
  await client.query('begin')
})

afterEach(async () => {
  await client.query('rollback')
  client.release()
})

async function insertUser(overrides: Partial<{ id: string; email: string }> = {}) {
  const user = { id: randomUUID(), email: 'driver@example.com', ...overrides }
  await client.query('insert into users (id, email, password_hash) values ($1, $2, $3)', [
    user.id,
    user.email,
    'hashed',
  ])
  return user
}

async function insertGate(userId: string, overrides: Partial<{ id: string; code: string }> = {}) {
  const gate = { id: randomUUID(), code: '0451#', ...overrides }
  await client.query(
    `insert into gates (id, user_id, name, code, lat, lng)
     values ($1, $2, 'Oakwood Estates', $3, 32.7767, -96.797)`,
    [gate.id, userId, gate.code],
  )
  return gate
}

describe('schema', () => {
  it('creates the four tables from CLAUDE.md', async () => {
    const { rows } = await client.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public'`,
    )
    const tableNames = rows.map((row) => row.table_name)

    expect(tableNames).toEqual(
      expect.arrayContaining(['users', 'sessions', 'gates', 'addresses']),
    )
  })

  it('enforces a unique index on users.email', async () => {
    await insertUser({ email: 'driver@example.com' })

    await expect(
      client.query('insert into users (id, email, password_hash) values ($1, $2, $3)', [
        randomUUID(),
        'driver@example.com',
        'hashed',
      ]),
    ).rejects.toThrow(/duplicate key/)
  })

  it('preserves a leading zero in a gate code', async () => {
    const user = await insertUser()
    const gate = await insertGate(user.id, { code: '0451#' })

    const { rows } = await client.query<{ code: string }>('select code from gates where id = $1', [
      gate.id,
    ])

    expect(rows[0].code).toBe('0451#')
  })

  it('cascades deleting a user to their sessions and gates', async () => {
    const user = await insertUser()
    const gate = await insertGate(user.id)
    await client.query(
      "insert into sessions (id, user_id, expires_at) values ($1, $2, now() + interval '1 day')",
      [randomUUID(), user.id],
    )

    await client.query('delete from users where id = $1', [user.id])

    const sessions = await client.query('select 1 from sessions where user_id = $1', [user.id])
    const gates = await client.query('select 1 from gates where id = $1', [gate.id])
    expect(sessions.rowCount).toBe(0)
    expect(gates.rowCount).toBe(0)
  })

  it('cascades deleting a gate to its addresses', async () => {
    const user = await insertUser()
    const gate = await insertGate(user.id)
    const addressId = randomUUID()
    await client.query('insert into addresses (id, gate_id, address) values ($1, $2, $3)', [
      addressId,
      gate.id,
      '123 Oak Lane',
    ])

    await client.query('delete from gates where id = $1', [gate.id])

    const { rowCount } = await client.query('select 1 from addresses where id = $1', [addressId])
    expect(rowCount).toBe(0)
  })
})

describe('GET /health', () => {
  it('returns a row count from Postgres', async () => {
    const user = await insertUser()
    await insertGate(user.id)

    const app = buildApp(client)
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      status: 'ok',
      counts: { users: 1, sessions: 0, gates: 1, addresses: 0 },
    })
  })
})
