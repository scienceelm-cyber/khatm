import { z } from "zod";
import { getDatabase } from "@/lib/database";
import { DEVOTION_IDS } from "@/lib/devotions";
import { isTrustedMutationRequest, json } from "@/lib/http";
import { ensureDefaultIntentions, ensureDevotionalProgress, getSiteState } from "@/lib/state";

export const dynamic = "force-dynamic";

const schema = z.object({
  intentionId: z.string().min(2).max(80),
  devotionId: z.enum(DEVOTION_IDS as [string, ...string[]]),
});

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return json({ error: "forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request" }, { status: 400 });

  try {
    const database = getDatabase();
    await ensureDefaultIntentions(database);
    await ensureDevotionalProgress(database);
    const row = await database
      .prepare(
        `UPDATE devotional_progress
         SET completed_cycles = completed_cycles + CASE WHEN current + 1 >= target THEN 1 ELSE 0 END,
             cycle = cycle + CASE WHEN current + 1 >= target THEN 1 ELSE 0 END,
             current = CASE WHEN current + 1 >= target THEN 0 ELSE current + 1 END,
             updated_at = CURRENT_TIMESTAMP
         WHERE intention_id = ? AND devotion_id = ?
           AND intention_id IN (SELECT id FROM intentions WHERE active = 1)
         RETURNING current, cycle, completed_cycles`,
      )
      .bind(parsed.data.intentionId, parsed.data.devotionId)
      .first<{ current: number; cycle: number; completed_cycles: number }>();

    if (!row) return json({ error: "intention_not_found" }, { status: 404 });
    return json({ completedCycle: Number(row.current) === 0, state: await getSiteState(database) });
  } catch (error) {
    console.error("devotion_failed", error);
    return json({ error: "devotion_failed" }, { status: 503 });
  }
}
