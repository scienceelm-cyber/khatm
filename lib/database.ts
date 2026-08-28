import { env } from "cloudflare:workers";

type RuntimeEnv = {
  DB?: D1Database;
  ADMIN_TOKEN?: string;
};

function runtimeEnv() {
  return env as unknown as RuntimeEnv;
}

export function getDatabase(): D1Database {
  const database = runtimeEnv().DB;
  if (!database) throw new Error("database_unavailable");
  return database;
}

export function getAdminToken(): string | null {
  const token = runtimeEnv().ADMIN_TOKEN?.trim();
  return token && token.length >= 20 ? token : null;
}
