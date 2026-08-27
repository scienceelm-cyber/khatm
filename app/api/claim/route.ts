import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { isTrustedMutationRequest } from "@/lib/http";
import { getAyah } from "@/lib/quran";
import { getOrCreateSessionId, sessionCookie } from "@/lib/session";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
const TOTAL_AYAHS = 6236;

type ClaimRow = { id: string; ayah_number: number; expires_at: Date };

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "cross_site_request_rejected" }, { status: 403 });
  }

  const { sessionId, isNew } = await getOrCreateSessionId();
  const configuredTtl = Number(process.env.CLAIM_TTL_MINUTES ?? 45);
  const ttl = Number.isFinite(configuredTtl) ? Math.min(180, Math.max(10, configuredTtl)) : 45;

  try {
    const claim = await withTransaction<ClaimRow | null>(async (client) => {
      const state = await client.query<{ current_cycle: number }>(
        "SELECT current_cycle FROM khatm_state WHERE id = 1 FOR UPDATE"
      );
      const cycle = state.rows[0]?.current_cycle;
      if (!cycle) throw new Error("state_missing");

      await client.query(
        "UPDATE verse_claims SET status = 'expired' WHERE cycle = $1 AND status = 'assigned' AND expires_at <= NOW()",
        [cycle]
      );

      const existing = await client.query<ClaimRow>(`
        SELECT id, ayah_number, expires_at
        FROM verse_claims
        WHERE cycle = $1 AND session_id = $2 AND status = 'assigned' AND expires_at > NOW()
        ORDER BY assigned_at DESC
        LIMIT 1
      `, [cycle, sessionId]);
      if (existing.rows[0]) return existing.rows[0];

      const next = await client.query<{ ayah_number: number }>(`
        SELECT n AS ayah_number
        FROM generate_series(1, $2::int) AS n
        WHERE NOT EXISTS (
          SELECT 1 FROM verse_claims c
          WHERE c.cycle = $1 AND c.ayah_number = n AND c.status IN ('assigned', 'completed')
        )
        ORDER BY n
        LIMIT 1
      `, [cycle, TOTAL_AYAHS]);

      const ayahNumber = next.rows[0]?.ayah_number;
      if (!ayahNumber) return null;

      const inserted = await client.query<ClaimRow>(`
        INSERT INTO verse_claims (cycle, ayah_number, session_id, status, expires_at)
        VALUES ($1, $2, $3, 'assigned', NOW() + ($4::text || ' minutes')::interval)
        RETURNING id, ayah_number, expires_at
      `, [cycle, ayahNumber, sessionId, ttl]);
      return inserted.rows[0] ?? null;
    });

    if (!claim) {
      const response = NextResponse.json(
        { error: "all_currently_claimed", stats: await getStats() },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
      if (isNew) response.cookies.set(sessionCookie(sessionId));
      return response;
    }

    const [ayah, stats] = await Promise.all([getAyah(claim.ayah_number), getStats()]);
    const response = NextResponse.json({
      claimId: claim.id,
      expiresAt: claim.expires_at.toISOString(),
      ayah,
      stats
    }, { headers: { "Cache-Control": "no-store" } });
    if (isNew) response.cookies.set(sessionCookie(sessionId));
    return response;
  } catch (error) {
    console.error("claim_failed", error);
    const response = NextResponse.json({ error: "claim_failed" }, { status: 503 });
    if (isNew) response.cookies.set(sessionCookie(sessionId));
    return response;
  }
}
