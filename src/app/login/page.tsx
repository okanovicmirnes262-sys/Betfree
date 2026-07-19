"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md"
        style={{ background: "linear-gradient(135deg, var(--green) 0%, var(--green-deep) 100%)" }}
        aria-hidden
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21c4.5-3.2 8-6.6 8-10.6C20 6.4 17.3 4 14.5 4 13.2 4 12.4 4.6 12 5.2 11.6 4.6 10.8 4 9.5 4 6.7 4 4 6.4 4 10.4c0 4 3.5 7.4 8 10.6Z"
            fill="currentColor"
            opacity="0.35"
          />
          <path
            d="M7 13.5c2.8 0 6.2-1.4 8-4.5 0 5-3.4 8-8 8v-3.5Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div>
        <div className="text-[17px] font-extrabold tracking-tight leading-none">
          Bet<span style={{ color: "var(--green)" }}>Free</span>
        </div>
        <div className="mt-0.5 text-[11.5px] font-medium" style={{ color: "var(--muted)" }}>
          tvoj put bez klađenja
        </div>
      </div>
    </div>
  );
}

function SocialButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  const [note, setNote] = useState(false);
  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => {
          setNote(true);
          setTimeout(() => setNote(false), 2200);
        }}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl border bg-white px-4 py-3 text-[14px] font-semibold transition hover:shadow-md active:scale-[0.98]"
        style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
      >
        {icon}
        {label}
      </button>
      {note && (
        <div
          className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium text-white"
          style={{ background: "var(--ink)" }}
        >
          Uskoro dostupno
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email, password } : { name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Nešto je pošlo po zlu. Pokušaj ponovno.");
        setLoading(false);
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setError("Ne mogu se spojiti na server. Provjeri vezu.");
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-2xl border bg-white px-4 py-3.5 text-[15px] font-medium outline-none transition placeholder:font-normal focus:ring-4";
  const inputStyle = {
    borderColor: "var(--line)",
    color: "var(--ink)",
  } as React.CSSProperties;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      {/* dekorativne mekane mrlje u pozadini */}
      <div
        aria-hidden
        className="blob pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, #cfe6d6 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="blob pointer-events-none absolute -bottom-32 -left-24 h-[26rem] w-[26rem] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, #d3e2ea 0%, transparent 70%)", animationDelay: "-7s" }}
      />

      <div className="animate-rise relative w-full max-w-md">
        <div className="mb-7 flex items-center justify-between">
          <Logo />
          <div
            className="mono rounded-full border bg-white/70 px-3 py-1.5 text-[11px] font-semibold tracking-wide backdrop-blur"
            style={{ borderColor: "var(--line)", color: "var(--green)" }}
          >
            100% ANONIMNO
          </div>
        </div>

        <div
          className="rounded-[28px] border bg-white/85 p-7 backdrop-blur-xl sm:p-8"
          style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-soft)" }}
        >
          {/* preklopnik prijava / registracija */}
          <div
            className="mb-7 grid grid-cols-2 rounded-2xl p-1"
            style={{ background: "var(--bg2)" }}
            role="tablist"
          >
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className="rounded-xl py-2.5 text-[14px] font-bold transition"
                style={
                  mode === m
                    ? { background: "#fff", color: "var(--ink)", boxShadow: "var(--shadow-card)" }
                    : { color: "var(--muted)" }
                }
              >
                {m === "login" ? "Prijava" : "Registracija"}
              </button>
            ))}
          </div>

          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">
            {mode === "login" ? "Dobrodošao natrag." : "Prvi dan bez oklade."}
          </h1>
          <p className="mt-1.5 text-[14.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
            {mode === "login"
              ? "Tvoj streak te čeka — nastavi gdje si stao."
              : "Otvori račun i tvoj napredak se čuva na svim uređajima."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3.5">
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-[13px] font-bold" style={{ color: "var(--ink-soft)" }}>
                  Ime ili nadimak
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kako da te zovemo?"
                  autoComplete="nickname"
                  required
                  className={inputCls}
                  style={{ ...inputStyle, ["--tw-ring-color" as string]: "var(--green-soft)" }}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-bold" style={{ color: "var(--ink-soft)" }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ti@email.com"
                autoComplete="email"
                required
                className={inputCls}
                style={{ ...inputStyle, ["--tw-ring-color" as string]: "var(--green-soft)" }}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-bold" style={{ color: "var(--ink-soft)" }}>
                Lozinka
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Barem 8 znakova" : "Tvoja lozinka"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={mode === "register" ? 8 : undefined}
                  className={inputCls + " pr-12"}
                  style={{ ...inputStyle, ["--tw-ring-color" as string]: "var(--green-soft)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Sakrij lozinku" : "Prikaži lozinku"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition hover:bg-black/5"
                  style={{ color: "var(--muted)" }}
                >
                  {showPass ? (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="animate-rise rounded-2xl border px-4 py-3 text-[13.5px] font-semibold"
                style={{ background: "#fdf0ec", borderColor: "#f3cfc2", color: "var(--ember-deep)" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-2xl py-4 text-[16px] font-extrabold text-white transition active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, var(--green) 0%, var(--green-deep) 100%)",
                boxShadow: "0 8px 24px rgba(47, 122, 88, 0.35)",
              }}
            >
              {loading
                ? "Samo trenutak…"
                : mode === "login"
                  ? "Prijavi se"
                  : "Kreni — besplatno je"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3.5">
            <div className="h-px flex-1" style={{ background: "var(--line)" }} />
            <span className="text-[12px] font-semibold" style={{ color: "var(--muted)" }}>
              ili nastavi s
            </span>
            <div className="h-px flex-1" style={{ background: "var(--line)" }} />
          </div>

          <div className="flex gap-3">
            <SocialButton
              label="Google"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3a7.24 7.24 0 0 1-10.78-3.8H1.28v3.09A12 12 0 0 0 12 24Z" />
                  <path fill="#FBBC05" d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l4-3.09Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.98 11.98 0 0 0 1.28 6.62l4 3.09A7.16 7.16 0 0 1 12 4.75Z" />
                </svg>
              }
            />
            <SocialButton
              label="Apple"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.87 3.11-.78 1.42.11 2.49.68 3.2 1.7-2.94 1.76-2.24 5.63.45 6.71-.54 1.42-1.24 2.83-1.84 4.54ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
                </svg>
              }
            />
          </div>

          <p className="mt-6 text-center text-[12px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Tvoji podaci su privatni i nikad se ne dijele.
            <br />
            Nastavkom prihvaćaš da BetFree nije zamjena za stručnu pomoć.
          </p>
        </div>

        <p className="mt-5 text-center text-[13px] font-semibold" style={{ color: "var(--muted)" }}>
          {mode === "login" ? (
            <>
              Nemaš račun?{" "}
              <button onClick={() => setMode("register")} className="font-extrabold underline-offset-2 hover:underline" style={{ color: "var(--green)" }}>
                Registriraj se
              </button>
            </>
          ) : (
            <>
              Već imaš račun?{" "}
              <button onClick={() => setMode("login")} className="font-extrabold underline-offset-2 hover:underline" style={{ color: "var(--green)" }}>
                Prijavi se
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
