import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("defines Persian RTL metadata without starter markers", async () => {
  const [layout, page, serverBundle] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../dist/server/index.js", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /title:\s*"ختم جمعی قرآن و صلوات"/);
  assert.match(layout, /<html lang="fa" dir="rtl">/);
  assert.doesNotMatch(`${layout}\n${page}`, /Starter Project|codex-preview/i);
  assert.match(serverBundle, /ختم جمعی قرآن و صلوات/);
});
