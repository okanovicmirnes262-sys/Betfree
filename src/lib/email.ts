import { createHash, randomBytes } from "crypto";
import { query } from "./db";

/**
 * Sends an email through Brevo (https://brevo.com — free tier: 300/day,
 * only a verified sender address required, no domain needed).
 * Returns false when BREVO_API_KEY isn't configured or sending fails.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "BetFree", email: from },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function emailShell(title: string, body: string, ctaText: string, ctaUrl: string) {
  return `<!doctype html><body style="margin:0;background:#f1f2f4;font-family:system-ui,sans-serif;padding:32px 16px">
  <div style="max-width:440px;margin:0 auto;background:#fff;border-radius:20px;padding:32px">
    <div style="font-size:18px;font-weight:800;color:#1a211d">Bet<span style="color:#2f7a58">Free</span></div>
    <h1 style="font-size:21px;color:#1a211d;margin:18px 0 8px">${title}</h1>
    <p style="font-size:14.5px;line-height:1.6;color:#414b45;margin:0 0 22px">${body}</p>
    <a href="${ctaUrl}" style="display:block;text-align:center;background:#2f7a58;color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:14px;border-radius:14px">${ctaText}</a>
    <p style="font-size:12px;color:#79837c;margin:22px 0 0;line-height:1.5">If you didn't request this, you can safely ignore this email. The link expires in 1 hour.</p>
  </div></body>`;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a one-time token for the user and returns the raw value (only the hash is stored). */
export async function createEmailToken(userId: number, kind: "reset" | "verify"): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await query({
    sql: "INSERT INTO email_tokens (user_id, kind, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    args: [userId, kind, hashToken(token), Date.now() + 60 * 60 * 1000],
  });
  return token;
}

/** Validates and consumes a token; returns the user id or null. */
export async function consumeEmailToken(token: string, kind: "reset" | "verify"): Promise<number | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const res = await query({
    sql: "SELECT id, user_id, expires_at, used FROM email_tokens WHERE token_hash = ? AND kind = ?",
    args: [hashToken(token), kind],
  });
  const row = res.rows[0];
  if (!row || Number(row.used) === 1 || Number(row.expires_at) < Date.now()) return null;
  await query({ sql: "UPDATE email_tokens SET used = 1 WHERE id = ?", args: [row.id as number] });
  return Number(row.user_id);
}
