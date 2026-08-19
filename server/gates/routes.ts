import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../auth/middleware.js'
import type { Queryable } from '../db.js'

interface ClientCodeHistoryEntry {
  id: string
  code: string
  supersededAt: string
}

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
  codeHistory: ClientCodeHistoryEntry[]
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

interface CodeHistoryRow {
  id: string
  gate_id: string
  code: string
  superseded_at: Date
}

function toClientGate(row: GateRow, codeHistory: ClientCodeHistoryEntry[]): ClientGate {
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
    codeHistory,
  }
}

export function registerGateRoutes(app: FastifyInstance, db: Queryable): void {
  const auth = requireAuth(db)

  app.get('/api/gates', { preHandler: auth }, async (request) => {
    const userId = request.user!.id

    const [gates, history] = await Promise.all([
      db.query<GateRow>(
        `select id, name, code, notes, lat, lng, accuracy, created_at, updated_at, deleted_at
         from gates where user_id = $1`,
        [userId],
      ),
      db.query<CodeHistoryRow>(
        `select code_history.id, code_history.gate_id, code_history.code, code_history.superseded_at
         from code_history
         join gates on gates.id = code_history.gate_id
         where gates.user_id = $1
         order by code_history.superseded_at desc`,
        [userId],
      ),
    ])

    const historyByGate = new Map<string, ClientCodeHistoryEntry[]>()
    for (const row of history.rows) {
      const entry: ClientCodeHistoryEntry = {
        id: row.id,
        code: row.code,
        supersededAt: row.superseded_at.toISOString(),
      }
      const existing = historyByGate.get(row.gate_id)
      if (existing) {
        existing.push(entry)
      } else {
        historyByGate.set(row.gate_id, [entry])
      }
    }

    return gates.rows.map((row) => toClientGate(row, historyByGate.get(row.id) ?? []))
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

      for (const entry of gate.codeHistory) {
        // History is append-only and immutable — ON CONFLICT DO NOTHING is
        // enough, and the EXISTS guard mirrors the gate upsert's ownership
        // check so a foreign gate id can't be used to attach history to it.
        await db.query(
          `insert into code_history (id, gate_id, code, superseded_at)
           select $1, $2, $3, $4
           where exists (select 1 from gates where gates.id = $2 and gates.user_id = $5)
           on conflict (id) do nothing`,
          [entry.id, gate.id, entry.code, entry.supersededAt, userId],
        )
      }
    }

    reply.code(200).send({ ok: true })
  })
}
