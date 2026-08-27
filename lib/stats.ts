import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import type { KhatmStats } from "@/lib/types";

const TOTAL_AYAHS = 6236;

type StateRow = {
  current_cycle: number;
  completed_khatms: number;
  intention: string;
  completed_ayahs: string | number;
  active_readers: string | number;
};

type QueryExecutor = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: StateRow[] }>;
};

async function queryStats(executor: QueryExecutor): Promise<KhatmStats> {
  const result = await executor.query(`
    SELECT
      s.current_cycle,
      s.completed_khatms,
      s.intention,
      (SELECT COUNT(*) FROM verse_claims c WHERE c.cycle = s.current_cycle AND c.status = 'completed') AS completed_ayahs,
      (SELECT COUNT(*) FROM verse_claims c WHERE c.cycle = s.current_cycle AND c.status = 'assigned' AND c.expires_at > NOW()) AS active_readers
    FROM khatm_state s
    WHERE s.id = 1
  `);
  const row = result.rows[0];
  if (!row) throw new Error("Khatm state is not initialized");
  const completedAyahs = Number(row.completed_ayahs);
  return {
    intention: row.intention,
    currentCycle: row.current_cycle,
    completedKhatms: row.completed_khatms,
    completedAyahs,
    activeReaders: Number(row.active_readers),
    progressPercent: Math.min(100, Math.round((completedAyahs / TOTAL_AYAHS) * 10_000) / 100)
  };
}

export const getStats = () => queryStats(pool as unknown as QueryExecutor);
export const getStatsInTransaction = (client: PoolClient) => queryStats(client as unknown as QueryExecutor);
