import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("keeps Quran as the default experience and exposes all collective modes", async () => {
  const source = await read("components/KhatmApp.tsx");
  assert.match(source, /useState<Mode>\("quran"\)/);
  assert.match(source, /ختم قرآن/);
  assert.match(source, /ختم صلوات/);
  assert.match(source, /هدیه معنوی/);
  assert.match(source, /ثبت صلوات‌ها/);
  assert.match(source, /خواندم/);
});

test("ships sourced devotions with synchronized progress", async () => {
  const [catalog, state, endpoint, migration, androidModels] = await Promise.all([
    read("lib/devotions.ts"),
    read("lib/state.ts"),
    read("app/api/devotions/contribute/route.ts"),
    read("drizzle/0001_open_arachne.sql"),
    read("android/app/src/main/java/com/imangpt/khatm/data/Models.kt"),
  ]);
  assert.match(catalog, /آیت‌الکرسی/);
  assert.match(catalog, /زیارت عاشورا/);
  assert.match(catalog, /sistani\.org/);
  assert.match(catalog, /عدد هدف فقط/);
  assert.match(state, /devotional_progress/);
  assert.match(endpoint, /completedCycle/);
  assert.match(migration, /CREATE TABLE `devotional_progress`/);
  assert.match(androidModels, /DEVOTIONS/);
  assert.match(androidModels, /DevotionProgress/);
});

test("adds production security headers and avoids automatic Quran claims", async () => {
  const [worker, app] = await Promise.all([
    read("worker/index.ts"),
    read("components/KhatmApp.tsx"),
  ]);
  assert.match(worker, /Strict-Transport-Security/);
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /X-Content-Type-Options/);
  assert.doesNotMatch(app, /autoClaimedRef/);
  assert.match(app, /دریافت آیه من/);
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
