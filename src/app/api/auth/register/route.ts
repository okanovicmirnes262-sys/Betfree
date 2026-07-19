import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
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

    const existing = await query({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [cleanEmail],
    });
    if (existing.rows.length > 0)
      return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });

    const hash = await bcrypt.hash(pass, 10);
    const now = new Date().toISOString();
    const res = await query({
      sql: "INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)",
      args: [cleanEmail, hash, cleanName, now],
    });
    const userId = Number(res.lastInsertRowid);
    await query({
      sql: "INSERT INTO profiles (user_id, updated_at) VALUES (?, ?)",
      args: [userId, now],
    });

    await setSessionCookie({ userId, email: cleanEmail });
    return NextResponse.json({ ok: true, user: { id: userId, name: cleanName, email: cleanEmail } });
  } catch {
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
