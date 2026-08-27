import { Pool, type PoolClient, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { khatmPool?: Pool };

export const pool =
  globalForDb.khatmPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.NODE_ENV === "production" && process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined
  });

if (process.env.NODE_ENV !== "production") globalForDb.khatmPool = pool;

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function one<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
  const result = await pool.query<T>(sql, params);
  return result.rows[0] ?? null;
}
