import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
