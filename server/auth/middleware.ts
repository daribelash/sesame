import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Queryable } from '../db.js'
import { getSessionUser, type SessionUser } from './session.js'

export const SESSION_COOKIE = 'sesame_session'

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null
  }
}

/** Fastify preHandler: 401s on a missing, malformed, or expired session. */
export function requireAuth(db: Queryable) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const sessionId: string | undefined = request.cookies[SESSION_COOKIE]
    const user = sessionId ? await getSessionUser(db, sessionId) : null

    if (!user) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }

    request.user = user
  }
}
