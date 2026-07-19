"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).then((r) => r.json()).catch(() => null);
    setLoading(false);
    if (res?.ok) setSent(true);
    else setError(res?.error || "Something went wrong. Please try again.");
  }

  return (
    <main className="safe-main flex min-h-dvh items-center justify-center">
      <div className="animate-rise w-full max-w-md">
        <div
          className="rounded-[28px] border p-7 sm:p-8"
          style={{ borderColor: "var(--line)", background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="BetFree" className="h-14 w-14" />
          <h1 className="mt-4 text-[24px] font-extrabold leading-tight tracking-tight">Forgot your password?</h1>
          {sent ? (
            <>
              <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
                If an account exists for <b style={{ color: "var(--ink)" }}>{email}</b>, we&apos;ve sent a reset link.
                Check your inbox (and spam folder) — the link works for 1 hour.
              </p>
              <Link
                href="/login"
                className="mt-6 block w-full rounded-2xl py-3.5 text-center text-[15px] font-extrabold text-white"
                style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))" }}
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
                Enter your email and we&apos;ll send you a link to choose a new password.
              </p>
              <form onSubmit={submit} className="mt-5 space-y-3.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  required
                  className="surface w-full rounded-2xl border px-4 py-3.5 font-medium outline-none"
                />
                {error && (
                  <div
                    role="alert"
                    className="animate-rise rounded-2xl border px-4 py-3 text-[13.5px] font-semibold"
                    style={{ background: "var(--ember-soft)", borderColor: "var(--ember-soft-border)", color: "var(--ember-deep)" }}
                  >
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl py-3.5 text-[15px] font-extrabold text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))" }}
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
              <p className="mt-5 text-center text-[13px] font-semibold" style={{ color: "var(--muted)" }}>
                Remembered it?{" "}
                <Link href="/login" className="font-extrabold underline-offset-2 hover:underline" style={{ color: "var(--green)" }}>
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
