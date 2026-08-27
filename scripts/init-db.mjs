import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = await fs.readFile(path.join(process.cwd(), "db/schema.sql"), "utf8");
const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
const client = new Client({ connectionString: databaseUrl, ssl });
await client.connect();
try {
  await client.query(sql);
  console.log("Database initialized.");
} finally {
  await client.end();
}
