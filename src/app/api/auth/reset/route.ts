import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { consumeEmailToken } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!(await rateLimit(`reset-ip:${ip}`, 10, 3600)))
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

    const { token, password } = await req.json().catch(() => ({}));
    const pass = String(password || "");
    if (pass.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const userId = await consumeEmailToken(String(token || ""), "reset");
    if (!userId)
      return NextResponse.json(
        { error: "This link is invalid or has expired. Request a new one." },
        { status: 400 }
      );

    const hash = await bcrypt.hash(pass, 10);
    // bump token_version: every existing session signs out
    await query({
      sql: "UPDATE users SET password_hash = ?, token_version = token_version + 1, email_verified = 1 WHERE id = ?",
      args: [hash, userId],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
