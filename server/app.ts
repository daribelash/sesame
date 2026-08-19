import { existsSync } from 'node:fs'
import path from 'node:path'
import fastifyCookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyInstance } from 'fastify'
import { registerAddressRoutes } from './addresses/routes.js'
import { registerAuthRoutes } from './auth/routes.js'
import type { Queryable } from './db.js'
import { registerGateRoutes } from './gates/routes.js'

const DIST_DIR = path.join(import.meta.dirname, '..', 'dist')

interface TableCounts {
  users: number
  sessions: number
  gates: number
  addresses: number
}

export function buildApp(db: Queryable): FastifyInstance {
  const app = Fastify()

  app.register(fastifyCookie)
  registerAuthRoutes(app, db)
  registerGateRoutes(app, db)
  registerAddressRoutes(app, db)

  app.get('/health', async () => {
    const { rows } = await db.query<TableCounts>(`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from sessions) as sessions,
        (select count(*)::int from gates) as gates,
        (select count(*)::int from addresses) as addresses
    `)

    return { status: 'ok', counts: rows[0] }
  })

  // Only present once `npm run build` has run — lets integration tests and
  // early local dev boot the API without a frontend build on disk.
  if (existsSync(DIST_DIR)) {
    app.register(fastifyStatic, { root: DIST_DIR })
  }

  return app
}
