import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { Queryable } from '../db.js'
import { requireAuth, SESSION_COOKIE } from './middleware.js'
import { hashPassword, verifyPassword } from './password.js'
import { createSession, deleteSession } from './session.js'

interface Credentials {
  email?: string
  password?: string
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
  )
}

export function registerAuthRoutes(app: FastifyInstance, db: Queryable): void {
  app.post<{ Body: Credentials }>('/api/register', async (request, reply) => {
    const { email, password } = request.body

    if (!email || !password || password.length < 8) {
      reply
        .code(400)
        .send({ error: 'Email and a password of at least 8 characters are required' })
      return
    }

    const passwordHash = await hashPassword(password)
    const userId = randomUUID()

    try {
      await db.query('insert into users (id, email, password_hash) values ($1, $2, $3)', [
        userId,
        email,
        passwordHash,
      ])
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({ error: 'Email already registered' })
        return
      }
      throw error
    }

    const session = await createSession(db, userId)
    reply.setCookie(SESSION_COOKIE, session.id, { ...COOKIE_OPTIONS, expires: session.expiresAt })
    reply.code(201).send({ id: userId, email })
  })

  app.post<{ Body: Credentials }>('/api/login', async (request, reply) => {
    const { email, password } = request.body

    if (!email || !password) {
      reply.code(400).send({ error: 'Email and password are required' })
      return
    }

    const { rows } = await db.query<{ id: string; password_hash: string }>(
      'select id, password_hash from users where email = $1',
      [email],
    )
    const user = rows[0]

    if (!user || !(await verifyPassword(user.password_hash, password))) {
      reply.code(401).send({ error: 'Invalid email or password' })
      return
    }

    const session = await createSession(db, user.id)
    reply.setCookie(SESSION_COOKIE, session.id, { ...COOKIE_OPTIONS, expires: session.expiresAt })
    reply.send({ id: user.id, email })
  })

  app.post('/api/logout', async (request, reply) => {
    const sessionId: string | undefined = request.cookies[SESSION_COOKIE]
    if (sessionId) {
      await deleteSession(db, sessionId)
    }
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    reply.code(204).send()
  })

  app.get('/api/me', { preHandler: requireAuth(db) }, async (request) => {
    return request.user
  })
}
