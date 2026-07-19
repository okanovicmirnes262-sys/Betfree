import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const res = await query({
      sql: `SELECT p.id, p.user_id, p.nickname, p.streak_days, p.text, p.created_at,
              (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.kind = 'cheer') AS cheers,
              EXISTS(SELECT 1 FROM post_reactions r WHERE r.post_id = p.id AND r.user_id = ? AND r.kind = 'cheer') AS mine
            FROM community_posts p
            WHERE (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.kind = 'flag') < 3
            ORDER BY p.id DESC LIMIT 80`,
      args: [session.userId],
    });
    return NextResponse.json({
      posts: res.rows.map((r) => ({
        id: Number(r.id),
        nickname: String(r.nickname),
        // stable per-user tag so identical nicknames can't impersonate each other
        tag: (((Number(r.user_id) * 2654435761) >>> 0) % 0xffff).toString(16).padStart(4, "0"),
        streakDays: Number(r.streak_days),
        text: String(r.text),
        createdAt: String(r.created_at),
        cheers: Number(r.cheers),
        mine: Number(r.mine) === 1,
      })),
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
    const text = String(body.text || "").trim().slice(0, 220);
    if (!text) return NextResponse.json({ error: "Write something first." }, { status: 400 });

    // one post per 5 minutes per user
    const last = await query({
      sql: "SELECT created_at FROM community_posts WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      args: [session.userId],
    });
    const lastAt = last.rows[0]?.created_at ? new Date(String(last.rows[0].created_at)).getTime() : 0;
    if (Date.now() - lastAt < 5 * 60 * 1000)
      return NextResponse.json({ error: "You can post again in a few minutes." }, { status: 429 });

    const userRes = await query({
      sql: "SELECT name FROM users WHERE id = ?",
      args: [session.userId],
    });
    const profRes = await query({
      sql: "SELECT quit_start FROM profiles WHERE user_id = ?",
      args: [session.userId],
    });
    const quitStart = profRes.rows[0]?.quit_start ? new Date(String(profRes.rows[0].quit_start)).getTime() : Date.now();
    const streakDays = Math.max(0, Math.floor((Date.now() - quitStart) / 86400000));

    await query({
      sql: "INSERT INTO community_posts (user_id, nickname, streak_days, text, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [session.userId, String(userRes.rows[0]?.name || "Anonymous"), streakDays, text, new Date().toISOString()],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
