import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { sendEmail, emailShell, createEmailToken } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!(await rateLimit(`verify:${session.userId}`, 3, 3600)))
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

    const res = await query({
      sql: "SELECT email, email_verified FROM users WHERE id = ?",
      args: [session.userId],
    });
    const user = res.rows[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (Number(user.email_verified) === 1) return NextResponse.json({ ok: true, already: true });

    const token = await createEmailToken(session.userId, "verify");
    const origin = new URL(req.url).origin;
    const sent = await sendEmail(
      String(user.email),
      "Verify your BetFree email",
      emailShell(
        "Verify your email",
        "Confirm this email address so you can recover your BetFree account if you ever forget your password.",
        "Verify my email",
        `${origin}/api/auth/verify?token=${token}`
      )
    );
    if (!sent)
      return NextResponse.json(
        { error: "Email sending is not configured yet. Please try again later." },
        { status: 503 }
      );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
