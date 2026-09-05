import { DECEASED_GUIDANCE, DEVOTIONS } from "@/lib/devotions";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify({ devotions: DEVOTIONS, guidance: DECEASED_GUIDANCE }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
