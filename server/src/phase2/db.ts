/**
 * PHASE 2 — Database access layer (node-pg).
 *
 * The sandbox cannot run the Prisma engine binaries, so all Phase-2 server
 * code talks to PostgreSQL through parameterised raw SQL (the same pattern
 * proven by prisma/catalog/loadCatalog.ts). No @prisma/client import here.
 */
import { Pool, PoolClient, QueryResultRow } from 'pg';

const url =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@127.0.0.1:5432/pak_test_db';

export const pool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 });

/** Run a query and return all rows. */
export async function q<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await pool.query<T>(text, params)).rows;
}

/** Run a query and return the first row or null. */
export async function q1<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

/** Run a query and return the scalar first-column value of the first row. */
export async function qScalar<T = string | number | boolean | null>(text: string, params: unknown[] = []): Promise<T | null> {
  const row = await q1(text, params);
  return row ? (Object.values(row)[0] as T) ?? null : null;
}

/** Execute a write/DDL statement and return the affected row count. */
export async function run(text: string, params: unknown[] = []): Promise<number> {
  const result = await pool.query(text, params);
  return result.rowCount ?? 0;
}

export type TxClient = PoolClient;

/** Execute fn inside ONE transaction (BEGIN/COMMIT/ROLLBACK). */
export async function withTx<T>(fn: (c: TxClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore rollback failure */
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Same helpers but bound to an explicit transaction client. */
export const makeTxHelpers = (c: TxClient) => ({
  q: async <T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> =>
    (await c.query<T>(text, params)).rows,
  q1: async <T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | null> => {
    const rows = (await c.query<T>(text, params)).rows;
    return rows[0] ?? null;
  },
});
