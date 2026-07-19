import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, batch } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendEmail, emailShell, createEmailToken } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!(await rateLimit(`reg:${ip}`, 10, 3600)))
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

    const { name, email, password } = await req.json();
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const pass = String(password || "");

    if (!cleanName || cleanName.length < 2)
      return NextResponse.json({ error: "Enter your name (at least 2 characters)." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (pass.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    // hash before the existence check so both paths take similar time
    const hash = await bcrypt.hash(pass, 10);

    const existing = await query({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [cleanEmail],
    });
    if (existing.rows.length > 0)
      return NextResponse.json(
        { error: "This email can't be used for a new account. If it's yours, try signing in." },
        { status: 409 }
      );

    const now = new Date().toISOString();
    // atomic: a user row is never created without its profile row
    const results = await batch([
      {
        sql: "INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)",
        args: [cleanEmail, hash, cleanName, now],
      },
      {
        sql: "INSERT INTO profiles (user_id, updated_at) VALUES (last_insert_rowid(), ?)",
        args: [now],
      },
    ]);
    const userId = Number(results[0].lastInsertRowid);

    // fire-and-forget verification email; registration succeeds either way
    try {
      const token = await createEmailToken(userId, "verify");
      const origin = new URL(req.url).origin;
      void sendEmail(
        cleanEmail,
        "Welcome to BetFree — verify your email",
        emailShell(
          "Welcome to BetFree",
          "You just took the hardest step. Confirm this email address so you can recover your account if you ever forget your password.",
          "Verify my email",
          `${origin}/api/auth/verify?token=${token}`
        )
      );
    } catch {}

    await setSessionCookie({ userId, email: cleanEmail, v: 0 });
    return NextResponse.json({ ok: true, user: { id: userId, name: cleanName, email: cleanEmail } });
  } catch {
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
