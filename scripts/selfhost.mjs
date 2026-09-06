#!/usr/bin/env node

import { access, copyFile, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const configPath = path.join(root, "wrangler.jsonc");
const templatePath = path.join(root, "wrangler.selfhost.example.jsonc");
const placeholder = "PASTE_DATABASE_ID_HERE";
const command = process.argv[2] ?? "check";

process.chdir(root);

function info(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`\nخطا: ${message}\n`);
  process.exitCode = 1;
}

async function exists(file) {
  try {
    await access(file, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function prepare() {
  if (await exists(configPath)) {
    info("wrangler.jsonc از قبل وجود دارد و بازنویسی نشد.");
    return;
  }
  await copyFile(templatePath, configPath, constants.COPYFILE_EXCL);
  info("wrangler.jsonc ساخته شد.");
  info("حالا database_id واقعی Cloudflare D1 را جای PASTE_DATABASE_ID_HERE بگذارید.");
}

async function check() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 13)) {
    throw new Error(`Node.js 22.13 یا جدیدتر لازم است؛ نسخه فعلی ${process.versions.node} است.`);
  }
  if (!(await exists(path.join(root, "node_modules", ".bin", process.platform === "win32" ? "vinext.cmd" : "vinext")))) {
    throw new Error("وابستگی‌ها نصب نیستند. ابتدا npm ci را اجرا کنید.");
  }
  if (!(await exists(configPath))) {
    throw new Error("wrangler.jsonc وجود ندارد. ابتدا npm run selfhost:prepare را اجرا کنید.");
  }
  const config = await readFile(configPath, "utf8");
  if (config.includes(placeholder)) {
    throw new Error("database_id هنوز تنظیم نشده است. شناسه D1 را در wrangler.jsonc وارد کنید.");
  }
  if (!/"binding"\s*:\s*"DB"/.test(config)) {
    throw new Error('اتصال پایگاه داده باید دقیقاً binding برابر "DB" داشته باشد.');
  }
  if (!/"migrations_dir"\s*:\s*"drizzle"/.test(config)) {
    throw new Error('مسیر migration باید دقیقاً "drizzle" باشد.');
  }
  info("بررسی تنظیمات موفق بود.");
  info("یادآوری امنیتی: ADMIN_TOKEN را فقط با wrangler secret put ADMIN_TOKEN ثبت کنید.");
}

function runLocal(binary, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const executable = process.platform === "win32" ? `${binary}.cmd` : binary;
    const child = spawn(executable, ["--no-install", ...args], {
      cwd: root,
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${binary} با کد ${code ?? signal ?? "نامشخص"} متوقف شد.`));
    });
  });
}

async function build() {
  await check();
  await runLocal("npx", ["vinext", "build"], { KHATM_SELF_HOST: "1" });
}

async function deploy() {
  await build();
  await runLocal("npx", ["wrangler", "deploy"]);
  info("انتشار تمام شد. آدرس workers.dev نمایش‌داده‌شده در بالا را باز کنید.");
}

try {
  if (command === "prepare") await prepare();
  else if (command === "check") await check();
  else if (command === "build") await build();
  else if (command === "deploy") await deploy();
  else throw new Error("دستور معتبر نیست. از prepare، check، build یا deploy استفاده کنید.");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
