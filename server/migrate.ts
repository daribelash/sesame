import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Pool } from 'pg'

const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations')

/** Applies migrations/*.sql in filename order, skipping ones already run. */
export async function migrate(pool: Pool): Promise<void> {
  await pool.query(`
    create table if not exists schema_migrations (
      filename   text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const { rows } = await pool.query<{ filename: string }>(
    'select filename from schema_migrations',
  )
  const applied = new Set(rows.map((row) => row.filename))

  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort()

  for (const file of files) {
    if (applied.has(file)) continue

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf-8')
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('insert into schema_migrations (filename) values ($1)', [file])
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
}
