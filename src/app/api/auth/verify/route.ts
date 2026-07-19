import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { consumeEmailToken } from "@/lib/email";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const userId = await consumeEmailToken(token, "verify").catch(() => null);
  if (userId) {
    await query({
      sql: "UPDATE users SET email_verified = 1 WHERE id = ?",
      args: [userId],
    }).catch(() => {});
  }
  const dest = url.origin + (userId ? "/app?verified=1" : "/login?verify=failed");
  return NextResponse.redirect(dest);
}
