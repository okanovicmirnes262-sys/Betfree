import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const AVATAR_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    const fields: string[] = [];
    const args: (string | number)[] = [];

    if (typeof body.firstName === "string") {
      fields.push("first_name = ?");
      args.push(body.firstName.trim().slice(0, 60));
    }
    if (typeof body.lastName === "string") {
      fields.push("last_name = ?");
      args.push(body.lastName.trim().slice(0, 60));
    }
    if (typeof body.phone === "string") {
      const phone = body.phone.trim().slice(0, 30);
      if (phone && !/^[+0-9 ()/-]{5,30}$/.test(phone))
        return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
      fields.push("phone = ?");
      args.push(phone);
    }
    if (typeof body.avatar === "string") {
      if (body.avatar !== "" && (!AVATAR_RE.test(body.avatar) || body.avatar.length > 400000))
        return NextResponse.json({ error: "Invalid image. Please try a different photo." }, { status: 400 });
      fields.push("avatar = ?");
      args.push(body.avatar);
    }

    if (fields.length === 0)
      return NextResponse.json({ error: "Nothing to save" }, { status: 400 });

    args.push(session.userId);
    await query({
      sql: `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      args,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
