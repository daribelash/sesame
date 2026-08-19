import { createPool } from './db.js'
import { migrate } from './migrate.js'

const pool = createPool()
await migrate(pool)
await pool.end()
console.log('Migrations applied')
