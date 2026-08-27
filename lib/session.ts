import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const COOKIE = "khatm_sid";

export async function getOrCreateSessionId(): Promise<{ sessionId: string; isNew: boolean }> {
  const store = await cookies();
  const current = store.get(COOKIE)?.value;
  if (current && /^[0-9a-f-]{36}$/i.test(current)) return { sessionId: current, isNew: false };
  return { sessionId: randomUUID(), isNew: true };
}

export function sessionCookie(value: string) {
  return {
    name: COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  };
}
