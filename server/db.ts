import { Pool, type QueryResult, type QueryResultRow } from 'pg'

/**
 * Structural subset of pg's Pool/PoolClient query method. Lets buildApp
 * accept either a real Pool (production) or a single open transaction's
 * PoolClient (integration tests — see server/app.test.ts).
 */
export interface Queryable {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>
}

export function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  // Hosted Postgres (Railway, Render, etc.) commonly presents a certificate
  // that isn't in Node's trust store — rejectUnauthorized: false accepts it
  // without verifying the chain, the standard trade-off for these providers
  // (the connection is still encrypted, just not certificate-pinned). Local
  // dev Postgres has no TLS listener at all, so SSL must stay off there.
  const ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  return new Pool({ connectionString, ssl })
}
