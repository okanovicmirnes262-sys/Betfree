import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "./db";

const RAW_SECRET = process.env.SESSION_SECRET;
const SECRET = new TextEncoder().encode(RAW_SECRET || "betfree-dev-only-secret");

/**
 * Refuses to sign tokens with the publicly-known fallback secret in
 * production (checked at request time — build time has no env vars).
 */
function requireSecret() {
  if (!RAW_SECRET && process.env.NODE_ENV === "production")
    throw new Error("SESSION_SECRET environment variable must be set in production.");
  return SECRET;
}

export const SESSION_COOKIE = "betfree_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // persistent session — 1 year

type SessionPayload = { userId: number; email: string; v?: number };

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(requireSecret());
}

export async function verifySessionToken(token: string) {
  // fail secure: with no real secret in production, no token can be trusted
  if (!RAW_SECRET && process.env.NODE_ENV === "production") return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

const unauthorized = () =>
  new Response(JSON.stringify({ error: "Not signed in" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });

/**
 * Verifies the JWT AND its token_version against the database, so
 * "sign out on all devices" (and future password changes) can revoke
 * already-issued tokens.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) throw unauthorized();
  const res = await query({
    sql: "SELECT token_version FROM users WHERE id = ?",
    args: [session.userId],
  });
  const dbVersion = Number(res.rows[0]?.token_version ?? -1);
  if (dbVersion === -1 || dbVersion !== (session.v ?? 0)) throw unauthorized();
  return session;
}
