import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("keeps Quran as the default experience and exposes both collective modes", async () => {
  const source = await read("components/KhatmApp.tsx");
  assert.match(source, /useState<Mode>\("quran"\)/);
  assert.match(source, /ختم قرآن/);
  assert.match(source, /ختم صلوات/);
  assert.match(source, /ثبت صلوات‌ها/);
  assert.match(source, /خواندم/);
});

test("ships the three requested intentions and durable bindings", async () => {
  const [state, hosting, schema] = await Promise.all([
    read("lib/state.ts"),
    read(".openai/hosting.json"),
    read("db/schema.ts"),
  ]);
  assert.match(state, /امام زمان \(عج\)/);
  assert.match(state, /مرحوم محمدعلی رامش/);
  assert.match(state, /چهارده معصوم \(ع\)/);
  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.match(schema, /quranClaims/);
  assert.match(schema, /salawatTarget/);
});

test("keeps intention management protected and non-destructive", async () => {
  const [admin, database] = await Promise.all([
    read("app/api/admin/intentions/route.ts"),
    read("lib/database.ts"),
  ]);
  assert.match(admin, /secureEqual/);
  assert.match(admin, /SET active = 0/);
  assert.match(database, /ADMIN_TOKEN/);
});
