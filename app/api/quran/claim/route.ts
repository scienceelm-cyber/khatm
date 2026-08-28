import { z } from "zod";
import { getDatabase } from "@/lib/database";
import { attachSessionCookie, getOrCreateSession, isTrustedMutationRequest, json } from "@/lib/http";
import { getAyah } from "@/lib/quran";
import { ensureDefaultIntentions, expireOldClaims, getSiteState, intentionExists, TOTAL_AYAHS } from "@/lib/state";

export const dynamic = "force-dynamic";

const schema = z.object({ intentionId: z.string().min(2).max(80) });
const CLAIM_TTL_SECONDS = 45 * 60;

type ClaimRow = { id: string; ayah_number: number; expires_at: number };

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return json({ error: "forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request" }, { status: 400 });

  const { sessionId, cookie } = getOrCreateSession(request);
  try {
    const database = getDatabase();
    await ensureDefaultIntentions(database);
    const intention = await intentionExists(database, parsed.data.intentionId);
    if (!intention) return json({ error: "intention_not_found" }, { status: 404 });

    const now = Math.floor(Date.now() / 1000);
    await expireOldClaims(database, now);

    let claim = await database
      .prepare(
        `SELECT id, ayah_number, expires_at
         FROM quran_claims
         WHERE intention_id = ? AND cycle = ? AND session_id = ?
           AND status = 'assigned' AND expires_at > ?
         ORDER BY assigned_at DESC LIMIT 1`,
      )
      .bind(intention.id, intention.quran_cycle, sessionId, now)
      .first<ClaimRow>();

    for (let attempt = 0; !claim && attempt < 4; attempt += 1) {
      const next = await database
        .prepare(
          `WITH RECURSIVE numbers(value) AS (
             SELECT 1
             UNION ALL
             SELECT value + 1 FROM numbers WHERE value < ?
           )
           SELECT value AS ayah_number
           FROM numbers
           WHERE NOT EXISTS (
             SELECT 1 FROM quran_claims c
             WHERE c.intention_id = ? AND c.cycle = ? AND c.ayah_number = value
               AND c.status IN ('assigned', 'completed')
           )
           ORDER BY value ASC LIMIT 1`,
        )
        .bind(TOTAL_AYAHS, intention.id, intention.quran_cycle)
        .first<{ ayah_number: number }>();

      if (!next) {
        const response = json({ error: "all_currently_claimed", state: await getSiteState(database) }, { status: 409 });
        return attachSessionCookie(response, cookie);
      }

      const id = crypto.randomUUID();
      const expiresAt = now + CLAIM_TTL_SECONDS;
      try {
        await database
          .prepare(
            `INSERT INTO quran_claims
             (id, intention_id, cycle, ayah_number, session_id, status, expires_at)
             VALUES (?, ?, ?, ?, ?, 'assigned', ?)`,
          )
          .bind(id, intention.id, intention.quran_cycle, next.ayah_number, sessionId, expiresAt)
          .run();
        claim = { id, ayah_number: next.ayah_number, expires_at: expiresAt };
      } catch (error) {
        if (attempt === 3) throw error;
      }
    }

    if (!claim) throw new Error("claim_unavailable");
    const [ayah, state] = await Promise.all([getAyah(claim.ayah_number), getSiteState(database)]);
    const response = json({
      claim: {
        claimId: claim.id,
        expiresAt: new Date(claim.expires_at * 1000).toISOString(),
        ayah,
      },
      state,
    });
    return attachSessionCookie(response, cookie);
  } catch (error) {
    console.error("claim_failed", error);
    return attachSessionCookie(json({ error: "claim_failed" }, { status: 503 }), cookie);
  }
}
