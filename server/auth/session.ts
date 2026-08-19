import { randomUUID } from 'node:crypto'
import type { Queryable } from '../db.js'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface SessionUser {
  id: string
  email: string
}

export async function createSession(
  db: Queryable,
  userId: string,
): Promise<{ id: string; expiresAt: Date }> {
  const id = randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.query('insert into sessions (id, user_id, expires_at) values ($1, $2, $3)', [
    id,
    userId,
    expiresAt,
  ])

  return { id, expiresAt }
}

/** Looks up the user for a session id, or null if missing, malformed, or expired. */
export async function getSessionUser(db: Queryable, sessionId: string): Promise<SessionUser | null> {
  try {
    const { rows } = await db.query<SessionUser>(
      `select users.id, users.email
       from sessions
       join users on users.id = sessions.user_id
       where sessions.id = $1 and sessions.expires_at > now()`,
      [sessionId],
    )
    return rows[0] ?? null
  } catch {
    // Invalid UUID syntax, etc. — treat exactly like "no such session".
    return null
  }
}

export async function deleteSession(db: Queryable, sessionId: string): Promise<void> {
  await db.query('delete from sessions where id = $1', [sessionId])
}
