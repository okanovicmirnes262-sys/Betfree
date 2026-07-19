import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const trigger = String(body.trigger || "").slice(0, 200);
    const now = new Date().toISOString();

    await query({
      sql: "INSERT INTO urge_logs (user_id, trigger, won, created_at) VALUES (?, ?, 1, ?)",
      args: [session.userId, trigger, now],
    });
    await query({
      sql: "UPDATE profiles SET urges = urges + 1, updated_at = ? WHERE user_id = ?",
      args: [now, session.userId],
    });
    const res = await query({
      sql: "SELECT urges FROM profiles WHERE user_id = ?",
      args: [session.userId],
    });
    return NextResponse.json({ ok: true, urges: Number(res.rows[0]?.urges ?? 0) });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
