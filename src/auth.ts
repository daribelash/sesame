export interface AuthUser {
  id: string
  email: string
}

export class AuthError extends Error {}

const CACHED_USER_KEY = 'sesame:user'

/**
 * The last known logged-in identity, cached locally. This is what gates the
 * UI while offline — a session cookie can't be checked without the network,
 * but the app must still work offline once you've logged in once (CLAUDE.md:
 * local-first).
 */
export function getCachedUser(): AuthUser | null {
  const raw = localStorage.getItem(CACHED_USER_KEY)
  return raw ? (JSON.parse(raw) as AuthUser) : null
}

function cacheUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(CACHED_USER_KEY)
  }
}

async function postCredentials(url: string, email: string, password: string): Promise<AuthUser> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new AuthError(body?.error ?? 'Something went wrong')
  }

  const user = (await response.json()) as AuthUser
  cacheUser(user)
  return user
}

export function register(email: string, password: string): Promise<AuthUser> {
  return postCredentials('/api/register', email, password)
}

export function login(email: string, password: string): Promise<AuthUser> {
  return postCredentials('/api/login', email, password)
}

export async function logout(): Promise<void> {
  // Best-effort — logging out is a local decision the user made right now,
  // so forget the cached identity even if the server can't be reached to
  // invalidate the session too.
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
  cacheUser(null)
}

export type SessionCheck =
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated' } // server reachable, confirmed no valid session
  | { status: 'unknown' } // offline or server unreachable — can't confirm either way

/**
 * Verifies the cached identity against the server in the background. Only a
 * confirmed 401 clears the cache — a network failure must never log someone
 * out, or the app would stop working the moment you lose signal.
 */
export async function checkSession(): Promise<SessionCheck> {
  try {
    const response = await fetch('/api/me', { credentials: 'same-origin' })

    if (response.status === 401) {
      cacheUser(null)
      return { status: 'unauthenticated' }
    }
    if (!response.ok) return { status: 'unknown' }

    const user = (await response.json()) as AuthUser
    cacheUser(user)
    return { status: 'authenticated', user }
  } catch {
    return { status: 'unknown' }
  }
}
