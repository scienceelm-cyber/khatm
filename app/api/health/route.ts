import { getDatabase } from "@/lib/database";
import { json } from "@/lib/http";

export async function GET() {
  try {
    await getDatabase().prepare("SELECT 1 AS ok").first();
    return json({ ok: true });
  } catch {
    return json({ ok: false }, { status: 503 });
  }
}
