import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const res = await query({
      sql: "SELECT id, text FROM user_reasons WHERE user_id = ? ORDER BY id ASC",
      args: [session.userId],
    });
    return NextResponse.json({
      reasons: res.rows.map((r) => ({ id: Number(r.id), text: String(r.text) })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "").trim().slice(0, 200);
    if (!text) return NextResponse.json({ error: "Write a reason first." }, { status: 400 });

    const count = await query({
      sql: "SELECT COUNT(*) c FROM user_reasons WHERE user_id = ?",
      args: [session.userId],
    });
    if (Number(count.rows[0]?.c ?? 0) >= 10)
      return NextResponse.json({ error: "Maximum 10 reasons — delete one first." }, { status: 400 });

    const res = await query({
      sql: "INSERT INTO user_reasons (user_id, text, created_at) VALUES (?, ?, ?)",
      args: [session.userId, text, new Date().toISOString()],
    });
    return NextResponse.json({ ok: true, id: Number(res.lastInsertRowid) });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await query({
      sql: "DELETE FROM user_reasons WHERE id = ? AND user_id = ?",
      args: [id, session.userId],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
