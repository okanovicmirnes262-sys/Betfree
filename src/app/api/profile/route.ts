import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const args: (string | number)[] = [];

    if (typeof body.weeklySpend === "number" && body.weeklySpend >= 0 && body.weeklySpend <= 100000) {
      fields.push("weekly_spend = ?");
      args.push(body.weeklySpend);
    }
    if (typeof body.riskScore === "number" && body.riskScore >= 0 && body.riskScore <= 40) {
      fields.push("risk_score = ?");
      args.push(Math.round(body.riskScore));
    }
    if (typeof body.quizDone === "boolean") {
      fields.push("quiz_done = ?");
      args.push(body.quizDone ? 1 : 0);
    }
    if (body.quitStart === "now") {
      fields.push("quit_start = COALESCE(quit_start, ?)");
      args.push(now);
    } else if (body.quitStart === "reset") {
      fields.push("quit_start = ?");
      args.push(now);
    }

    if (fields.length === 0)
      return NextResponse.json({ error: "Nema ničega za spremiti" }, { status: 400 });

    fields.push("updated_at = ?");
    args.push(now, session.userId);
    await query({
      sql: `UPDATE profiles SET ${fields.join(", ")} WHERE user_id = ?`,
      args,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
