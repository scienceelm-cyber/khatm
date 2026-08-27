import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { isTrustedMutationRequest } from "@/lib/http";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
const PLACEHOLDER_TOKEN = "REPLACE_ME_WITH_A_LONG_RANDOM_SECRET";
const schema = z.object({
  token: z.string().min(8).max(512),
  intention: z.string().trim().min(3).max(300)
});

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "cross_site_request_rejected" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || adminToken.length < 20 || adminToken === PLACEHOLDER_TOKEN) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }
  if (!safeEqual(body.data.token, adminToken)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await pool.query(`
    UPDATE khatm_state
    SET intention = $1, intention_updated_at = NOW(), updated_at = NOW()
    WHERE id = 1
  `, [body.data.intention]);

  return NextResponse.json(await getStats(), { headers: { "Cache-Control": "no-store" } });
}
