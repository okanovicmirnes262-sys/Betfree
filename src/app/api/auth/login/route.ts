import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const pass = String(password || "");

    if (!cleanEmail || !pass)
      return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

    const res = await query({
      sql: "SELECT id, email, password_hash, name FROM users WHERE email = ?",
      args: [cleanEmail],
    });
    const user = res.rows[0];
    if (!user || !(await bcrypt.compare(pass, String(user.password_hash))))
      return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });

    await setSessionCookie({ userId: Number(user.id), email: cleanEmail });
    return NextResponse.json({
      ok: true,
      user: { id: Number(user.id), name: String(user.name), email: cleanEmail },
    });
  } catch {
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
