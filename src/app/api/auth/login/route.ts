import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// compared against when the email doesn't exist, so both paths cost one bcrypt
const DUMMY_HASH = "$2b$10$J4nal3JmZ65oNzaCmRKRw.Pnm3GINzQXCIB8Q6i1I7H8yMkBlsuPu";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const pass = String(password || "");

    if (!cleanEmail || !pass)
      return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

    const ip = clientIp(req);
    const [ipOk, emailOk] = await Promise.all([
      rateLimit(`login-ip:${ip}`, 20, 900),
      rateLimit(`login-email:${cleanEmail}`, 10, 900),
    ]);
    if (!ipOk || !emailOk)
      return NextResponse.json({ error: "Too many attempts. Please try again in 15 minutes." }, { status: 429 });

    const res = await query({
      sql: "SELECT id, email, password_hash, name, token_version FROM users WHERE email = ?",
      args: [cleanEmail],
    });
    const user = res.rows[0];
    const passOk = await bcrypt.compare(pass, user ? String(user.password_hash) : DUMMY_HASH);
    if (!user || !passOk)
      return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });

    await setSessionCookie({
      userId: Number(user.id),
      email: cleanEmail,
      v: Number(user.token_version || 0),
    });
    return NextResponse.json({
      ok: true,
      user: { id: Number(user.id), name: String(user.name), email: cleanEmail },
    });
  } catch {
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
