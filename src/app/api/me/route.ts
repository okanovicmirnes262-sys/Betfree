import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const userRes = await query({
      sql: "SELECT id, email, name, created_at FROM users WHERE id = ?",
      args: [session.userId],
    });
    const user = userRes.rows[0];
    if (!user) return NextResponse.json({ error: "Korisnik ne postoji" }, { status: 404 });

    const profRes = await query({
      sql: "SELECT weekly_spend, risk_score, quiz_done, quit_start, urges FROM profiles WHERE user_id = ?",
      args: [session.userId],
    });
    const p = profRes.rows[0];
    return NextResponse.json({
      user: { id: Number(user.id), name: String(user.name), email: String(user.email) },
      profile: p
        ? {
            weeklySpend: Number(p.weekly_spend),
            riskScore: Number(p.risk_score),
            quizDone: Number(p.quiz_done) === 1,
            quitStart: p.quit_start ? String(p.quit_start) : null,
            urges: Number(p.urges),
          }
        : null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
