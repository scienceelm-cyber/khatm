import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { isTrustedMutationRequest } from "@/lib/http";
import { getOrCreateSessionId } from "@/lib/session";
import { getStatsInTransaction } from "@/lib/stats";

export const dynamic = "force-dynamic";
const TOTAL_AYAHS = 6236;
const bodySchema = z.object({ claimId: z.string().uuid() });

type Stats = Awaited<ReturnType<typeof getStatsInTransaction>>;
type CompletionResult =
  | { kind: "ok"; completedKhatm: boolean; stats: Stats }
  | { kind: "expired"; stats: Stats };

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "cross_site_request_rejected" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const { sessionId } = await getOrCreateSessionId();
  try {
    const result = await withTransaction<CompletionResult>(async (client) => {
      const stateResult = await client.query<{ current_cycle: number; intention: string }>(
        "SELECT current_cycle, intention FROM khatm_state WHERE id = 1 FOR UPDATE"
      );
      const state = stateResult.rows[0];
      if (!state) throw new Error("state_missing");

      const claimResult = await client.query<{
        id: string;
        cycle: number;
        ayah_number: number;
        status: string;
        is_unexpired: boolean;
      }>(`
        SELECT id, cycle, ayah_number, status, (expires_at > NOW()) AS is_unexpired
        FROM verse_claims
        WHERE id = $1 AND session_id = $2
        FOR UPDATE
      `, [parsed.data.claimId, sessionId]);
      const claim = claimResult.rows[0];
      if (!claim) throw new Error("claim_not_found");

      if (claim.status === "completed") {
        return { kind: "ok", completedKhatm: false, stats: await getStatsInTransaction(client) };
      }

      if (claim.cycle !== state.current_cycle || claim.status !== "assigned" || !claim.is_unexpired) {
        if (claim.status === "assigned") {
          await client.query("UPDATE verse_claims SET status = 'expired' WHERE id = $1", [claim.id]);
        }
        return { kind: "expired", stats: await getStatsInTransaction(client) };
      }

      await client.query(`
        UPDATE verse_claims
        SET status = 'completed', completed_at = NOW()
        WHERE id = $1
      `, [claim.id]);

      const countResult = await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM verse_claims
        WHERE cycle = $1 AND status = 'completed'
      `, [state.current_cycle]);
      const count = Number(countResult.rows[0]?.count ?? 0);
      let completedKhatm = false;

      if (count === TOTAL_AYAHS) {
        const inserted = await client.query(`
          INSERT INTO khatm_history (cycle, intention)
          VALUES ($1, $2)
          ON CONFLICT (cycle) DO NOTHING
          RETURNING cycle
        `, [state.current_cycle, state.intention]);

        if (inserted.rowCount === 1) {
          completedKhatm = true;
          await client.query(`
            UPDATE khatm_state
            SET current_cycle = current_cycle + 1,
                completed_khatms = completed_khatms + 1,
                updated_at = NOW()
            WHERE id = 1
          `);
        }
      }

      return { kind: "ok", completedKhatm, stats: await getStatsInTransaction(client) };
    });

    if (result.kind === "expired") {
      return NextResponse.json(
        { error: "claim_expired", stats: result.stats },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { completedKhatm: result.completedKhatm, stats: result.stats },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "complete_failed";
    const status = message === "claim_not_found" ? 404 : 503;
    console.error("complete_failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}
