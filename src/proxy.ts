import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const RAW_SECRET = process.env.SESSION_SECRET;
const SECRET = new TextEncoder().encode(RAW_SECRET || "betfree-dev-only-secret");

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("betfree_session")?.value;
  let valid = false;
  // In production a missing SESSION_SECRET means no token can be trusted —
  // fail secure instead of validating against the public dev fallback.
  const secretUsable = Boolean(RAW_SECRET) || process.env.NODE_ENV !== "production";
  if (token && secretUsable) {
    try {
      await jwtVerify(token, SECRET);
      valid = true;
    } catch {
      valid = false;
    }
  }
  if (!valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/app"],
};
