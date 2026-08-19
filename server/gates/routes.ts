import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../auth/middleware.js'
import type { Queryable } from '../db.js'

interface ClientGate {
  id: string
  name: string
  code: string
  notes: string
  lat: number | null
  lng: number | null
  accuracy: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface GateRow {
  id: string
  name: string
  code: string
  notes: string | null
  lat: number | null
  lng: number | null
  accuracy: number | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

function toClientGate(row: GateRow): ClientGate {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    notes: row.notes ?? '',
    lat: row.lat,
    lng: row.lng,
    accuracy: row.accuracy,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
  }
}

export function registerGateRoutes(app: FastifyInstance, db: Queryable): void {
  const auth = requireAuth(db)

  app.get('/api/gates', { preHandler: auth }, async (request) => {
    const { rows } = await db.query<GateRow>(
      `select id, name, code, notes, lat, lng, accuracy, created_at, updated_at, deleted_at
       from gates where user_id = $1`,
      [request.user!.id],
    )
    return rows.map(toClientGate)
  })

  app.post<{ Body: ClientGate[] }>('/api/gates', { preHandler: auth }, async (request, reply) => {
    if (!Array.isArray(request.body)) {
      reply.code(400).send({ error: 'Expected an array of gates' })
      return
    }

    const userId = request.user!.id

    for (const gate of request.body) {
      // ON CONFLICT ... WHERE scopes the upsert to rows this user owns —
      // a gate id colliding with another account's silently no-ops rather
      // than hijacking it.
      await db.query(
        `insert into gates (id, user_id, name, code, lat, lng, accuracy, notes, created_at, updated_at, deleted_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         on conflict (id) do update set
           name = excluded.name,
           code = excluded.code,
           lat = excluded.lat,
           lng = excluded.lng,
           accuracy = excluded.accuracy,
           notes = excluded.notes,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at
         where gates.user_id = $2`,
        [
          gate.id,
          userId,
          gate.name,
          gate.code,
          gate.lat,
          gate.lng,
          gate.accuracy,
          gate.notes,
          gate.createdAt,
          gate.updatedAt,
          gate.deletedAt,
        ],
      )
    }

    reply.code(200).send({ ok: true })
  })
}
