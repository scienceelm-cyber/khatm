export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function isTrustedMutationRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host");
    return Boolean(host && originUrl.host === host);
  } catch {
    return false;
  }
}

function cookieValue(request: Request, key: string): string | null {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === key) return decodeURIComponent(rest.join("="));
  }
  return null;
}

const SESSION_COOKIE = "khatm_sid";

export function getOrCreateSession(request: Request) {
  const current = cookieValue(request, SESSION_COOKIE);
  if (current && /^[0-9a-f-]{36}$/i.test(current)) {
    return { sessionId: current, cookie: null as string | null };
  }

  const sessionId = crypto.randomUUID();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const cookie = `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`;
  return { sessionId, cookie };
}

export function attachSessionCookie(response: Response, cookie: string | null) {
  if (cookie) response.headers.append("Set-Cookie", cookie);
  return response;
}

export async function secureEqual(provided: string, expected: string) {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}
