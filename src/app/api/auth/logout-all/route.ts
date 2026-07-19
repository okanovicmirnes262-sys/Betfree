import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth, clearSessionCookie } from "@/lib/auth";

/** Bumps token_version, invalidating every issued session token for this user. */
export async function POST() {
  try {
    const session = await requireAuth();
    await query({
      sql: "UPDATE users SET token_version = token_version + 1 WHERE id = ?",
      args: [session.userId],
    });
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
