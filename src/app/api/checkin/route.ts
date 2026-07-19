import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const session = await requireAuth();
    const res = await query({
      sql: "SELECT day, mood, had_urge FROM user_checkins WHERE user_id = ? ORDER BY day DESC LIMIT 21",
      args: [session.userId],
    });
    const entries = res.rows.map((r) => ({
      day: String(r.day),
      mood: Number(r.mood),
      hadUrge: Number(r.had_urge) === 1,
    }));
    return NextResponse.json({
      doneToday: entries.some((e) => e.day === todayKey()),
      entries,
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
    const mood = Number(body.mood);
    const hadUrge = body.hadUrge === true;
    if (![1, 2, 3].includes(mood))
      return NextResponse.json({ error: "Pick how you feel today." }, { status: 400 });

    await query({
      sql: `INSERT INTO user_checkins (user_id, day, mood, had_urge, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, day) DO UPDATE SET mood = excluded.mood, had_urge = excluded.had_urge`,
      args: [session.userId, todayKey(), mood, hadUrge ? 1 : 0, new Date().toISOString()],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
