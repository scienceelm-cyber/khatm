import pg from "pg";

const { Client } = pg;
const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const origin = new URL(base).origin;
const databaseUrl = process.env.DATABASE_URL;
const adminToken = process.env.ADMIN_TOKEN;
if (!databaseUrl || !adminToken) throw new Error("DATABASE_URL and ADMIN_TOKEN are required for smoke tests");

const db = new Client({ connectionString: databaseUrl });
await db.connect();

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function reset() {
  await db.query("TRUNCATE verse_claims, khatm_history");
  await db.query(`
    UPDATE khatm_state
    SET current_cycle = 1,
        completed_khatms = 0,
        intention = 'نیت تست',
        intention_updated_at = NOW(),
        updated_at = NOW()
    WHERE id = 1
  `);
}

async function post(path, body, cookie) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual"
  });
  const data = await response.json().catch(() => ({}));
  return { response, data, cookie: response.headers.get("set-cookie")?.split(";")[0] ?? cookie };
}

try {
  await reset();

  const health = await fetch(`${base}/api/health`);
  assert(health.status === 200, "health endpoint should return 200");

  const first = await post("/api/claim");
  assert(first.response.status === 200, "first claim should succeed");
  assert(first.data.ayah.globalNumber === 1, "first claim should be global ayah 1");
  assert(Boolean(first.cookie), "claim should establish anonymous session cookie");

  const same = await post("/api/claim", undefined, first.cookie);
  assert(same.response.status === 200, "repeat claim in same session should succeed");
  assert(same.data.claimId === first.data.claimId, "refresh/retry must return same active claim");

  const done = await post("/api/complete", { claimId: first.data.claimId }, first.cookie);
  assert(done.response.status === 200, "completion should succeed");
  assert(done.data.stats.completedAyahs === 1, "completed count should become 1");

  const second = await post("/api/claim", undefined, first.cookie);
  assert(second.response.status === 200, "second claim should succeed");
  assert(second.data.ayah.globalNumber === 2, "sequence should advance to global ayah 2");

  await db.query("UPDATE verse_claims SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1", [second.data.claimId]);
  const expired = await post("/api/complete", { claimId: second.data.claimId }, first.cookie);
  assert(expired.response.status === 409, "expired claim must be rejected at completion time");
  assert(expired.data.error === "claim_expired", "expired completion should return claim_expired");

  const reclaimed = await post("/api/claim", undefined, first.cookie);
  assert(reclaimed.response.status === 200, "expired ayah should be reclaimable");
  assert(reclaimed.data.ayah.globalNumber === 2, "expired ayah must return to the head of the sequence");
  assert(reclaimed.data.claimId !== second.data.claimId, "reclaimed ayah should have a fresh claim id");

  const badAdmin = await post("/api/admin/intention", { token: "not-the-right-secret-token", intention: "نیت جدید تست" }, first.cookie);
  assert(badAdmin.response.status === 401, "wrong admin token must be rejected");

  const goodAdmin = await post("/api/admin/intention", { token: adminToken, intention: "نیت جدید تست" }, first.cookie);
  assert(goodAdmin.response.status === 200, "correct admin token should update intention");
  assert(goodAdmin.data.intention === "نیت جدید تست", "updated intention should be returned");

  const crossSite = await fetch(`${base}/api/claim`, { method: "POST", headers: { Origin: "https://evil.example" } });
  assert(crossSite.status === 403, "cross-site mutation must be rejected");

  await reset();
  const concurrent = await Promise.all(Array.from({ length: 20 }, () => post("/api/claim")));
  const numbers = concurrent.map(({ response, data }) => {
    assert(response.status === 200, "all concurrent claims should succeed");
    return data.ayah.globalNumber;
  }).sort((a, b) => a - b);
  assert(new Set(numbers).size === 20, "concurrent claims must be unique");
  assert(numbers.every((value, index) => value === index + 1), "concurrent claims should cover ayahs 1..20 without gaps");

  console.log("API smoke tests PASS");
} finally {
  await reset().catch(() => undefined);
  await db.end();
}
