import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const postId = Number(body.postId);
    const kind = String(body.kind);
    if (!postId || !["cheer", "flag"].includes(kind))
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });

    await query({
      sql: "INSERT OR IGNORE INTO post_reactions (post_id, user_id, kind) VALUES (?, ?, ?)",
      args: [postId, session.userId, kind],
    });
    const res = await query({
      sql: "SELECT COUNT(*) c FROM post_reactions WHERE post_id = ? AND kind = 'cheer'",
      args: [postId],
    });
    return NextResponse.json({ ok: true, cheers: Number(res.rows[0]?.c ?? 0) });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
