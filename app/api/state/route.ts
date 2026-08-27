import { NextResponse } from "next/server";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getStats(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "state_unavailable" }, { status: 503 });
  }
}
