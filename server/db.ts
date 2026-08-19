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
  return new Pool({ connectionString })
}
