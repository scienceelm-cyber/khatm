import { z } from "zod";
import { getDatabase } from "@/lib/database";
import { getOrCreateSession, isTrustedMutationRequest, json } from "@/lib/http";
import { ensureDefaultIntentions, getSiteState, TOTAL_AYAHS } from "@/lib/state";

export const dynamic = "force-dynamic";

const schema = z.object({ claimId: z.string().uuid() });

type ClaimRow = {
  id: string;
  intention_id: string;
  cycle: number;
  status: string;
  expires_at: number;
  quran_cycle: number;
  intention_title: string;
};

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return json({ error: "forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request" }, { status: 400 });

  const { sessionId } = getOrCreateSession(request);
  try {
    const database = getDatabase();
    await ensureDefaultIntentions(database);
    const claim = await database
      .prepare(
        `SELECT c.id, c.intention_id, c.cycle, c.status, c.expires_at,
                i.quran_cycle, i.title AS intention_title
         FROM quran_claims c
         JOIN intentions i ON i.id = c.intention_id
         WHERE c.id = ? AND c.session_id = ?`,
      )
      .bind(parsed.data.claimId, sessionId)
      .first<ClaimRow>();

    if (!claim) return json({ error: "claim_not_found" }, { status: 404 });
    if (claim.status === "completed") {
      return json({ completedKhatm: false, state: await getSiteState(database) });
    }

    const now = Math.floor(Date.now() / 1000);
    if (claim.status !== "assigned" || claim.expires_at <= now || claim.cycle !== claim.quran_cycle) {
      if (claim.status === "assigned") {
        await database.prepare("UPDATE quran_claims SET status = 'expired' WHERE id = ?").bind(claim.id).run();
      }
      return json({ error: "claim_expired", state: await getSiteState(database) }, { status: 409 });
    }

    const update = await database
      .prepare(
        `UPDATE quran_claims
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND session_id = ? AND status = 'assigned' AND expires_at > ?`,
      )
      .bind(claim.id, sessionId, now)
      .run();
    if (Number(update.meta.changes ?? 0) !== 1) {
      return json({ error: "claim_expired", state: await getSiteState(database) }, { status: 409 });
    }

    const countRow = await database
      .prepare(
        `SELECT COUNT(*) AS count FROM quran_claims
         WHERE intention_id = ? AND cycle = ? AND status = 'completed'`,
      )
      .bind(claim.intention_id, claim.cycle)
      .first<{ count: number }>();

    let completedKhatm = false;
    if (Number(countRow?.count ?? 0) >= TOTAL_AYAHS) {
      const history = await database
        .prepare(
          `INSERT OR IGNORE INTO quran_history
           (intention_id, cycle, intention_title)
           VALUES (?, ?, ?)`,
        )
        .bind(claim.intention_id, claim.cycle, claim.intention_title)
        .run();
      if (Number(history.meta.changes ?? 0) === 1) {
        const cycleUpdate = await database
          .prepare(
            `UPDATE intentions
             SET quran_cycle = quran_cycle + 1,
                 completed_quran_khatms = completed_quran_khatms + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND quran_cycle = ?`,
          )
          .bind(claim.intention_id, claim.cycle)
          .run();
        completedKhatm = Number(cycleUpdate.meta.changes ?? 0) === 1;
      }
    }

    return json({ completedKhatm, state: await getSiteState(database) });
  } catch (error) {
    console.error("complete_failed", error);
    return json({ error: "complete_failed" }, { status: 503 });
  }
}
