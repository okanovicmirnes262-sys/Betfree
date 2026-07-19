import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const CURRENCIES = ["EUR", "USD", "GBP"];

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
    if (typeof body.currency === "string" && CURRENCIES.includes(body.currency)) {
      fields.push("currency = ?");
      args.push(body.currency);
    }
    if (typeof body.goalName === "string") {
      fields.push("goal_name = ?");
      args.push(body.goalName.trim().slice(0, 60));
    }
    if (typeof body.goalAmount === "number" && body.goalAmount >= 0 && body.goalAmount <= 10000000) {
      fields.push("goal_amount = ?");
      args.push(body.goalAmount);
    }
    if (typeof body.debtAmount === "number" && body.debtAmount >= 0 && body.debtAmount <= 100000000) {
      fields.push("debt_amount = ?");
      args.push(body.debtAmount);
    }
    if (typeof body.dangerHours === "string") {
      let valid = body.dangerHours === "";
      if (!valid) {
        try {
          const d = JSON.parse(body.dangerHours);
          valid =
            Array.isArray(d.days) &&
            d.days.every((x: unknown) => typeof x === "number" && x >= 0 && x <= 6) &&
            d.days.length <= 7 &&
            typeof d.from === "number" && d.from >= 0 && d.from <= 23 &&
            typeof d.to === "number" && d.to >= 1 && d.to <= 24 &&
            d.from < d.to;
        } catch {
          valid = false;
        }
      }
      if (!valid) return NextResponse.json({ error: "Invalid danger hours" }, { status: 400 });
      fields.push("danger_hours = ?");
      args.push(body.dangerHours.slice(0, 200));
    }
    if (body.quitStart === "now") {
      fields.push("quit_start = COALESCE(quit_start, ?)");
      args.push(now);
    }
    if (body.relapse === true) {
      fields.push("quit_start = ?", "relapses = relapses + 1");
      args.push(now);
    }

    if (fields.length === 0)
      return NextResponse.json({ error: "Nothing to save" }, { status: 400 });

    fields.push("updated_at = ?");
    args.push(now, session.userId);
    await query({
      sql: `UPDATE profiles SET ${fields.join(", ")} WHERE user_id = ?`,
      args,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
