import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../auth/middleware.js'
import type { Queryable } from '../db.js'

interface ClientAddress {
  id: string
  gateId: string
  address: string
  notes: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface AddressRow {
  id: string
  gate_id: string
  address: string
  notes: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

function toClientAddress(row: AddressRow): ClientAddress {
  return {
    id: row.id,
    gateId: row.gate_id,
    address: row.address,
    notes: row.notes ?? '',
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
  }
}

export function registerAddressRoutes(app: FastifyInstance, db: Queryable): void {
  const auth = requireAuth(db)

  app.get('/api/addresses', { preHandler: auth }, async (request) => {
    // Addresses have no user_id of their own — ownership is via the gate
    // they belong to.
    const { rows } = await db.query<AddressRow>(
      `select addresses.id, addresses.gate_id, addresses.address, addresses.notes,
              addresses.created_at, addresses.updated_at, addresses.deleted_at
       from addresses
       join gates on gates.id = addresses.gate_id
       where gates.user_id = $1`,
      [request.user!.id],
    )
    return rows.map(toClientAddress)
  })

  app.post<{ Body: ClientAddress[] }>(
    '/api/addresses',
    { preHandler: auth },
    async (request, reply) => {
      if (!Array.isArray(request.body)) {
        reply.code(400).send({ error: 'Expected an array of addresses' })
        return
      }

      const userId = request.user!.id

      for (const address of request.body) {
        // Mirrors gates' ownership guard: the WHERE EXISTS means an address
        // pointing at a gate id this user doesn't own silently no-ops
        // rather than attaching to (or hijacking) someone else's gate.
        await db.query(
          `insert into addresses (id, gate_id, address, notes, created_at, updated_at, deleted_at)
           select $1, $2, $3, $4, $5, $6, $7
           where exists (select 1 from gates where gates.id = $2 and gates.user_id = $8)
           on conflict (id) do update set
             address = excluded.address,
             notes = excluded.notes,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at
           where exists (
             select 1 from gates where gates.id = addresses.gate_id and gates.user_id = $8
           )`,
          [
            address.id,
            address.gateId,
            address.address,
            address.notes,
            address.createdAt,
            address.updatedAt,
            address.deletedAt,
            userId,
          ],
        )
      }

      reply.code(200).send({ ok: true })
    },
  )
}
