// =========================================================
//  Google OAuth 登入 + Session 管理
// =========================================================

import type { Env, SessionData } from './types';
import { SESSION_PREFIX, SESSION_TTL } from './constants';

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// ── Cookie 工具 ──
function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("Cookie") || "";
  const out: Record<string, string> = {};
  header.split(";").forEach(part => {
    const idx = part.indexOf("=");
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function cookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

// ── JWT (id_token) payload 解碼 (來源為 Google token endpoint，走 TLS，免驗簽) ──
function decodeJwtPayload(token: string): any {
  const part = token.split(".")[1];
  if (!part) throw new Error("invalid id_token");
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function redirectUri(request: Request): string {
  return new URL(request.url).origin + "/auth/callback";
}

function isEmailAllowed(email: string, env: Env): boolean {
  const raw = (env.ALLOWED_EMAILS || "").trim();
  if (!raw) return true; // 未設定 = 任何人皆可
  const list = raw.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

// ── 1. 導向 Google 登入 ──
export function loginRedirect(request: Request, env: Env): Response {
  if (!env.GOOGLE_CLIENT_ID) {
    return new Response("尚未設定 GOOGLE_CLIENT_ID", { status: 500 });
  }
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online"
  });
  return new Response(null, {
    status: 302,
    headers: {
      "Location": `${GOOGLE_AUTH_URL}?${params}`,
      "Set-Cookie": cookie("oauth_state", state, 600)
    }
  });
}

// ── 2. Google 回呼 ──
export async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(request);

  const fail = (msg: string) =>
    new Response(null, { status: 302, headers: { "Location": `/?error=${encodeURIComponent(msg)}` } });

  if (!code || !state || state !== cookies["oauth_state"]) return fail("login_failed");

  // 換取 token
  let payload: any;
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(request),
        grant_type: "authorization_code"
      })
    });
    if (!tokenRes.ok) return fail("token_failed");
    const tokens = await tokenRes.json() as { id_token?: string };
    if (!tokens.id_token) return fail("no_id_token");
    payload = decodeJwtPayload(tokens.id_token);
  } catch {
    return fail("token_error");
  }

  const email: string = payload.email || "";
  if (!email || payload.email_verified === false) return fail("email_unverified");
  if (!isEmailAllowed(email, env)) return fail("unauthorized");

  // 建立 session
  const sid = crypto.randomUUID();
  const session: SessionData = {
    sub: String(payload.sub),
    email,
    name: payload.name || email.split("@")[0],
    picture: payload.picture || ""
  };
  await env.POKEMON_KV.put(SESSION_PREFIX + sid, JSON.stringify(session), { expirationTtl: SESSION_TTL });

  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/",
      "Set-Cookie": cookie("sid", sid, SESSION_TTL)
    }
  });
}

// ── 3. 讀取 session ──
export async function getSession(request: Request, env: Env): Promise<SessionData | null> {
  const sid = parseCookies(request)["sid"];
  if (!sid) return null;
  const val = await env.POKEMON_KV.get(SESSION_PREFIX + sid, "json");
  return (val as SessionData) || null;
}

// ── 4. 登出 ──
export async function logout(request: Request, env: Env): Promise<Response> {
  const sid = parseCookies(request)["sid"];
  if (sid) await env.POKEMON_KV.delete(SESSION_PREFIX + sid);
  return new Response(null, {
    status: 302,
    headers: { "Location": "/", "Set-Cookie": cookie("sid", "", 0) }
  });
}
