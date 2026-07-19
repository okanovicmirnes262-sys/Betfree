"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    const token = new URLSearchParams(window.location.search).get("token") || "";
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).then((r) => r.json()).catch(() => null);
    setLoading(false);
    if (res?.ok) {
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } else {
      setError(res?.error || "Something went wrong. Please try again.");
    }
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
          <h1 className="mt-4 text-[24px] font-extrabold leading-tight tracking-tight">Choose a new password</h1>
          {done ? (
            <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: "var(--green-deep)" }}>
              ✓ Password changed. All devices have been signed out — taking you to sign in…
            </p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3.5">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (at least 8 characters)"
                autoComplete="new-password"
                required
                minLength={8}
                className="surface w-full rounded-2xl border px-4 py-3.5 font-medium outline-none"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat the new password"
                autoComplete="new-password"
                required
                minLength={8}
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
                {loading ? "Saving…" : "Save new password"}
              </button>
              <p className="text-center text-[13px] font-semibold" style={{ color: "var(--muted)" }}>
                Link expired?{" "}
                <Link href="/forgot" className="font-extrabold underline-offset-2 hover:underline" style={{ color: "var(--green)" }}>
                  Request a new one
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
