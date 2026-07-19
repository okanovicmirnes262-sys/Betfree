import { NextRequest } from "next/server";
import { query } from "./db";

/**
 * Database-backed fixed-window rate limiter (works across serverless
 * instances). Returns true when the request is allowed.
 */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const now = Date.now();
  const resetAt = now + windowSec * 1000;
  try {
    const res = await query({
      sql: `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
            ON CONFLICT(key) DO UPDATE SET
              count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
              reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
            RETURNING count`,
      args: [key, resetAt, now, now],
    });
    return Number(res.rows[0]?.count ?? 1) <= max;
  } catch {
    // fail open — a limiter outage must not lock users out
    return true;
  }
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : "").trim() || "unknown";
}
