import { getDatabase } from "@/lib/database";
import { json } from "@/lib/http";
import { ensureDefaultIntentions, expireOldClaims, getSiteState } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = getDatabase();
    await ensureDefaultIntentions(database);
    await expireOldClaims(database);
    return json(await getSiteState(database));
  } catch (error) {
    console.error("state_failed", error);
    return json({ error: "state_unavailable" }, { status: 503 });
  }
}
