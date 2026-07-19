import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendEmail, emailShell, createEmailToken } from "@/lib/email";

/** Always answers OK — never reveals whether the email has an account. */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({}));
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    const ip = clientIp(req);
    const [ipOk, emailOk] = await Promise.all([
      rateLimit(`forgot-ip:${ip}`, 10, 3600),
      rateLimit(`forgot-email:${cleanEmail}`, 3, 3600),
    ]);
    if (!ipOk || !emailOk)
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

    const res = await query({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [cleanEmail],
    });
    const user = res.rows[0];
    if (user) {
      const token = await createEmailToken(Number(user.id), "reset");
      const origin = new URL(req.url).origin;
      await sendEmail(
        cleanEmail,
        "Reset your BetFree password",
        emailShell(
          "Reset your password",
          "Someone (hopefully you) asked to reset the password for your BetFree account. Tap the button below to choose a new one.",
          "Choose a new password",
          `${origin}/reset?token=${token}`
        )
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
