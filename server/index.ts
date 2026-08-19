import { buildApp } from './app.js'
import { createPool } from './db.js'
import { migrate } from './migrate.js'

const pool = createPool()
await migrate(pool)

const app = buildApp(pool)

const port = Number(process.env.PORT ?? 3000)
await app.listen({ port, host: '0.0.0.0' })
console.log(`Sesame server listening on port ${port}`)
