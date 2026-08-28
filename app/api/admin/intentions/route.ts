import { z } from "zod";
import { getAdminToken, getDatabase } from "@/lib/database";
import { isTrustedMutationRequest, json, secureEqual } from "@/lib/http";
import { ensureDefaultIntentions, getSiteState } from "@/lib/state";

export const dynamic = "force-dynamic";

const common = {
  token: z.string().min(1).max(512),
  title: z.string().trim().min(3).max(160),
  subtitle: z.string().trim().max(240).default(""),
  salawatTarget: z.number().int().min(100).max(10_000_000),
};

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), ...common }),
  z.object({ action: z.literal("update"), id: z.string().min(2).max(80), ...common }),
  z.object({ action: z.literal("archive"), id: z.string().min(2).max(80), token: common.token }),
]);

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return json({ error: "forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request" }, { status: 400 });

  const configuredToken = getAdminToken();
  if (!configuredToken) return json({ error: "admin_not_configured" }, { status: 503 });
  if (!(await secureEqual(parsed.data.token, configuredToken))) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const database = getDatabase();
    await ensureDefaultIntentions(database);

    if (parsed.data.action === "create") {
      const order = await database
        .prepare("SELECT COALESCE(MAX(sort_order), 0) + 10 AS next_order FROM intentions")
        .first<{ next_order: number }>();
      await database
        .prepare(
          `INSERT INTO intentions
           (id, title, subtitle, active, sort_order, salawat_target)
           VALUES (?, ?, ?, 1, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          parsed.data.title,
          parsed.data.subtitle,
          Number(order?.next_order ?? 100),
          parsed.data.salawatTarget,
        )
        .run();
    }

    if (parsed.data.action === "update") {
      const result = await database
        .prepare(
          `UPDATE intentions
           SET title = ?, subtitle = ?, salawat_target = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND active = 1`,
        )
        .bind(parsed.data.title, parsed.data.subtitle, parsed.data.salawatTarget, parsed.data.id)
        .run();
      if (Number(result.meta.changes ?? 0) !== 1) return json({ error: "intention_not_found" }, { status: 404 });
    }

    if (parsed.data.action === "archive") {
      const active = await database
        .prepare("SELECT COUNT(*) AS count FROM intentions WHERE active = 1")
        .first<{ count: number }>();
      if (Number(active?.count ?? 0) <= 1) {
        return json({ error: "last_intention" }, { status: 409 });
      }
      const result = await database
        .prepare("UPDATE intentions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND active = 1")
        .bind(parsed.data.id)
        .run();
      if (Number(result.meta.changes ?? 0) !== 1) return json({ error: "intention_not_found" }, { status: 404 });
    }

    return json(await getSiteState(database));
  } catch (error) {
    console.error("admin_intention_failed", error);
    return json({ error: "admin_update_failed" }, { status: 503 });
  }
}
