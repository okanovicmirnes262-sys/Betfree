import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const userRes = await query({
      sql: "SELECT id, email, name, first_name, last_name, phone, avatar, created_at FROM users WHERE id = ?",
      args: [session.userId],
    });
    const user = userRes.rows[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const profRes = await query({
      sql: "SELECT weekly_spend, risk_score, quiz_done, quit_start, urges, currency, goal_name, goal_amount, relapses, debt_amount, danger_hours FROM profiles WHERE user_id = ?",
      args: [session.userId],
    });
    const p = profRes.rows[0];
    return NextResponse.json({
      user: {
        id: Number(user.id),
        name: String(user.name),
        email: String(user.email),
        firstName: String(user.first_name || ""),
        lastName: String(user.last_name || ""),
        phone: String(user.phone || ""),
        avatar: String(user.avatar || ""),
      },
      profile: p
        ? {
            weeklySpend: Number(p.weekly_spend),
            riskScore: Number(p.risk_score),
            quizDone: Number(p.quiz_done) === 1,
            quitStart: p.quit_start ? String(p.quit_start) : null,
            urges: Number(p.urges),
            currency: String(p.currency || "EUR"),
            goalName: String(p.goal_name || ""),
            goalAmount: Number(p.goal_amount || 0),
            relapses: Number(p.relapses || 0),
            debtAmount: Number(p.debt_amount || 0),
            dangerHours: String(p.danger_hours || ""),
          }
        : null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
