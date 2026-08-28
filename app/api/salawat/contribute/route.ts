import { z } from "zod";
import { getDatabase } from "@/lib/database";
import { isTrustedMutationRequest, json } from "@/lib/http";
import { ensureDefaultIntentions, getSiteState } from "@/lib/state";

export const dynamic = "force-dynamic";

const schema = z.object({
  intentionId: z.string().min(2).max(80),
  amount: z.number().int().min(1).max(1000),
});

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return json({ error: "forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request" }, { status: 400 });

  try {
    const database = getDatabase();
    await ensureDefaultIntentions(database);
    const row = await database
      .prepare(
        `UPDATE intentions
         SET completed_salawat_khatms = completed_salawat_khatms +
               CASE WHEN salawat_current + MIN(?, salawat_target - salawat_current) >= salawat_target THEN 1 ELSE 0 END,
             salawat_cycle = salawat_cycle +
               CASE WHEN salawat_current + MIN(?, salawat_target - salawat_current) >= salawat_target THEN 1 ELSE 0 END,
             salawat_current =
               CASE
                 WHEN salawat_current + MIN(?, salawat_target - salawat_current) >= salawat_target THEN 0
                 ELSE salawat_current + MIN(?, salawat_target - salawat_current)
               END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND active = 1
         RETURNING salawat_current, salawat_cycle, completed_salawat_khatms`,
      )
      .bind(
        parsed.data.amount,
        parsed.data.amount,
        parsed.data.amount,
        parsed.data.amount,
        parsed.data.intentionId,
      )
      .first<{ salawat_current: number; salawat_cycle: number; completed_salawat_khatms: number }>();

    if (!row) return json({ error: "intention_not_found" }, { status: 404 });
    return json({ completedKhatm: Number(row.salawat_current) === 0, state: await getSiteState(database) });
  } catch (error) {
    console.error("salawat_failed", error);
    return json({ error: "salawat_failed" }, { status: 503 });
  }
}
