"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { dailyMessage, milestones } from "@/lib/messages";

/* ---------------- types & data ---------------- */

type Profile = {
  weeklySpend: number;
  riskScore: number;
  quizDone: boolean;
  quitStart: string | null;
  urges: number;
  currency: string;
  goalName: string;
  goalAmount: number;
  relapses: number;
};

type Me = {
  user: {
    id: number;
    name: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    avatar: string;
  };
  profile: Profile;
};

type UrgeLog = { trigger: string; createdAt: string };

type Option = [string, number] | [string, number, number];

const QUESTIONS: { t: string; s: string; o: Option[] }[] = [
  { t: "How long have you been betting?", s: "Anything counts — sports, casino, slots, live betting.", o: [["Less than a year", 0], ["1–3 years", 1], ["3–7 years", 2], ["More than 7 years", 3]] },
  { t: "How often do you bet?", s: "Be honest — nobody sees this but you.", o: [["A few times a month", 0], ["Every weekend", 1], ["Almost every day", 2], ["Several times a day", 3]] },
  { t: "How much do you spend on betting per week, on average?", s: "Total stakes, not just 'net losses'.", o: [["Up to €15", 0, 10], ["€15–50", 1, 30], ["€50–150", 2, 90], ["Over €150", 3, 220]] },
  { t: "When you lose, how often do you chase the loss with new bets?", s: "Chasing losses is the strongest sign of a problem.", o: [["Never", 0], ["Sometimes", 1], ["Often", 2], ["Almost always", 3]] },
  { t: "Have you ever lied to people close to you about how much you bet?", s: "", o: [["No, everyone knows", 0], ["I've downplayed the amounts", 1], ["Yes, I hide it", 2], ["Nobody has any idea how much", 3]] },
  { t: "Betting during a match (live) — how often?", s: "Live betting is designed to be the hardest to control.", o: [["I don't bet live", 0], ["Rarely", 1], ["Regularly", 2], ["I can't watch a game without a live bet", 3]] },
  { t: "Have you ever gone into debt because of betting?", s: "Overdraft, borrowing from friends, loans, credit cards...", o: [["Never", 0], ["Overdrawn once or twice", 1], ["Yes, I've borrowed money", 2], ["Yes, I'm paying off debt", 3]] },
  { t: "Have you tried to quit before?", s: "", o: [["Never tried", 1], ["Once, lasted a while", 1], ["Several times, I always come back", 2], ["I keep trying and it doesn't work", 3]] },
  { t: "What's your most common trigger?", s: "We use this to build your plan.", o: [["Sports on TV and friends", 1], ["Bookmaker ads and offers", 1], ["Boredom and stress", 1], ["The feeling I 'have to win it back'", 2]] },
  { t: "How do you feel after a day of betting?", s: "Last question.", o: [["Fine, it's fun", 0], ["A little guilty sometimes", 1], ["I often feel bad", 2], ["Empty, angry and full of regret", 3]] },
];

const TRIGGERS = [
  "Watching a match / sports on TV",
  "A bookmaker ad or offer",
  "Payday / having money around",
  "Friends betting / talking about slips",
  "Boredom or stress",
];

const CURRENCIES = [
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
];

const EXCLUSION_STEPS = [
  "Write down every bookmaker and casino where you have an account (online and retail).",
  "In each app, open account settings → “Responsible gambling” → request self-exclusion for the longest possible period.",
  "Check whether your country has a national self-exclusion register — one request covers all licensed operators.",
  "Install a gambling-site blocker (e.g. Gamban or BetBlocker) on your phone and computer.",
  "Remove saved cards from betting apps and, if needed, ask your bank to block payments to gambling operators.",
];

const HELP_RESOURCES: [string, string][] = [
  ["Gamblers Anonymous", "free support groups; meetings exist in most larger cities and online."],
  ["Addiction counselling services", "confidential counselling, often available through public health clinics."],
  ["A therapist specialised in addiction", "the most effective path if betting has lasted years or there are debts."],
];

function fmtMoney(n: number, currency: string, decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/* ---------------- small components ---------------- */

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={"surface rounded-3xl border " + className} style={{ boxShadow: "var(--shadow-card)", ...style }}>
      {children}
    </div>
  );
}

function Avatar({ me, size = 44 }: { me: Me | null; size?: number }) {
  const src = me?.user.avatar;
  const initial = (me?.user.firstName || me?.user.name || "?").charAt(0).toUpperCase();
  return src ? (
    <img
      src={src}
      alt="Profile"
      className="rounded-full object-cover"
      style={{ width: size, height: size, boxShadow: "var(--shadow-card)" }}
    />
  ) : (
    <div
      className="flex items-center justify-center rounded-full font-extrabold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: "linear-gradient(135deg, var(--green), var(--green-deep))",
      }}
    >
      {initial}
    </div>
  );
}

function Logo({ size = 40 }: { size?: number }) {
  return <img src="/logo.png" alt="BetFree" style={{ width: size, height: size }} />;
}

type Tab = "home" | "journal" | "support" | "profile";

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "home",
      label: "Home",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      ),
    },
    {
      id: "journal",
      label: "Journal",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="3.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="3.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="3.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      id: "support",
      label: "Support",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21c4.5-3.2 8-6.6 8-10.6C20 6.4 17.3 4 14.5 4c-1.3 0-2.1.6-2.5 1.2C11.6 4.6 10.8 4 9.5 4 6.7 4 4 6.4 4 10.4c0 4 3.5 7.4 8 10.6Z" />
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
        </svg>
      ),
    },
  ];
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((it) => (
        <button key={it.id} aria-label={it.label} className={tab === it.id ? "active" : ""} onClick={() => setTab(it.id)}>
          {it.icon}
        </button>
      ))}
    </nav>
  );
}

/* ---------------- page ---------------- */

type Screen = "loading" | "welcome" | "quiz" | "result" | "dash";
type Sheet = "" | "log" | "slip";

export default function AppPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [screen, setScreen] = useState<Screen>("loading");
  const [tab, setTab] = useState<Tab>("home");

  // quiz
  const [qIndex, setQIndex] = useState(0);
  const [risk, setRisk] = useState(0);
  const [spend, setSpend] = useState(30);

  // dashboard
  const [now, setNow] = useState(() => Date.now());
  const [urges, setUrges] = useState(0);
  const [currency, setCurrency] = useState("EUR");
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState(0);
  const [panic, setPanic] = useState(false);
  const [sheet, setSheet] = useState<Sheet>("");
  const [logged, setLogged] = useState(false);
  const [animLoss, setAnimLoss] = useState(0);
  const [history, setHistory] = useState<UrgeLog[] | null>(null);

  // profile form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaved, setProfileSaved] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadMe = useCallback(async () => {
    const r = await fetch("/api/me");
    if (r.status === 401) {
      router.push("/login");
      return null;
    }
    const data: Me = await r.json();
    setMe(data);
    setUrges(data.profile?.urges ?? 0);
    setSpend(data.profile?.weeklySpend ?? 30);
    setRisk(data.profile?.riskScore ?? 0);
    setCurrency(data.profile?.currency ?? "EUR");
    setGoalName(data.profile?.goalName ?? "");
    setGoalAmount(data.profile?.goalAmount ?? 0);
    setFirstName(data.user?.firstName ?? "");
    setLastName(data.user?.lastName ?? "");
    setPhone(data.user?.phone ?? "");
    return data;
  }, [router]);

  useEffect(() => {
    loadMe()
      .then((data) => {
        if (data) setScreen(data.profile?.quizDone ? "dash" : "welcome");
      })
      .catch(() => setScreen("welcome"));
  }, [loadMe]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // fetch urge history when journal opens
  useEffect(() => {
    if (tab === "journal" && history === null) {
      fetch("/api/urges")
        .then((r) => r.json())
        .then((r) => setHistory(r?.urges ?? []))
        .catch(() => setHistory([]));
    }
  }, [tab, history]);

  // animated count-up of the projected loss on the result screen
  const fiveYr = spend * 52 * 5;
  useEffect(() => {
    if (screen !== "result") return;
    const dur = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      setAnimLoss(Math.round(fiveYr * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen, fiveYr]);

  const saveProfile = useCallback((body: Record<string, unknown>) => {
    return fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }, []);

  function answer(opt: Option) {
    const newRisk = risk + opt[1];
    const newSpend = opt.length > 2 ? (opt[2] as number) : spend;
    setRisk(newRisk);
    setSpend(newSpend);
    if (qIndex + 1 < QUESTIONS.length) {
      setQIndex(qIndex + 1);
    } else {
      saveProfile({ riskScore: newRisk, weeklySpend: newSpend, quizDone: true });
      setScreen("result");
    }
  }

  async function enterDash() {
    await saveProfile({ quitStart: "now" });
    await loadMe();
    setScreen("dash");
    setTab("home");
  }

  async function logUrge(trigger: string) {
    setLogged(true);
    const r = await fetch("/api/urges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger }),
    }).then((r) => r.json()).catch(() => null);
    if (r?.urges != null) setUrges(r.urges);
    else setUrges((u) => u + 1);
    setHistory(null);
  }

  async function confirmSlip() {
    await saveProfile({ relapse: true });
    await loadMe();
    setSheet("");
    setTab("home");
  }

  async function saveAccount(extra: Record<string, unknown> = {}) {
    setProfileSaved("");
    const res = await fetch("/api/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, ...extra }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) {
      setProfileSaved("Saved ✓");
      await loadMe();
      setTimeout(() => setProfileSaved(""), 2500);
    } else {
      setProfileSaved(res?.error || "Could not save. Try again.");
    }
  }

  function pickAvatar(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        saveAccount({ avatar: dataUrl });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  /* ---------------- derived ---------------- */

  if (screen === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="animate-rise flex flex-col items-center gap-3">
          <Logo size={64} />
          <div className="text-[15px] font-bold" style={{ color: "var(--muted)" }}>
            Loading your progress…
          </div>
        </div>
      </main>
    );
  }

  const displayName = me?.user.firstName || me?.user.name || "";
  const quitStart = me?.profile?.quitStart ? new Date(me.profile.quitStart).getTime() : now;
  const streakSec = Math.max(0, Math.floor((now - quitStart) / 1000));
  const streakDays = Math.floor(streakSec / 86400);
  const message = dailyMessage(streakDays);
  const saved = (spend / (7 * 24 * 3600)) * streakSec;
  const goalPct = goalAmount > 0 ? Math.min(100, (saved / goalAmount) * 100) : 0;

  const h = String(Math.floor((streakSec % 86400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((streakSec % 3600) / 60)).padStart(2, "0");
  const sec = String(streakSec % 60).padStart(2, "0");

  const inputCls = "surface w-full rounded-2xl border px-4 py-3 font-medium outline-none";
  const labelCls = "mb-1.5 block text-[13px] font-bold";

  return (
    <main className={"safe-main mx-auto flex min-h-dvh w-full max-w-md flex-col" + (screen === "dash" ? " with-nav" : "")}>
      {/* WELCOME */}
      {screen === "welcome" && (
        <section className="animate-rise flex flex-1 flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Logo size={38} />
              <span className="text-[16px] font-extrabold tracking-tight">
                Bet<span style={{ color: "var(--green)" }}>Free</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button onClick={logout} className="text-[13px] font-bold" style={{ color: "var(--muted)" }}>
                Sign out
              </button>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <div className="mono mb-3 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--green)" }}>
              10-question test · 2 minutes
            </div>
            <h1 className="hero-title font-extrabold leading-[1.1] tracking-tight">
              {displayName ? `${displayName}, what` : "What"} is betting really costing you?
            </h1>
            <p className="mt-3 text-[15.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
              Answer 10 questions honestly. We&apos;ll calculate what you&apos;re losing, assess your risk and build your personal quit plan. Everything stays private on your account.
            </p>
          </div>
          <button
            onClick={() => {
              setQIndex(0);
              setRisk(0);
              setScreen("quiz");
            }}
            className="w-full rounded-2xl py-4 text-[16px] font-extrabold text-white transition active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))", boxShadow: "0 8px 24px rgba(47,122,88,0.35)" }}
          >
            Start the test
          </button>
        </section>
      )}

      {/* QUIZ */}
      {screen === "quiz" && (
        <section className="animate-rise flex flex-1 flex-col" key={qIndex}>
          <div className="mb-7 flex items-center gap-3">
            <div className="mono whitespace-nowrap text-[13px] font-semibold" style={{ color: "var(--muted)" }}>
              {qIndex + 1} / 10
            </div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(qIndex / 10) * 100}%`, background: "var(--green)" }} />
            </div>
          </div>
          <h2 className="text-[24px] font-extrabold leading-tight tracking-tight">{QUESTIONS[qIndex].t}</h2>
          {QUESTIONS[qIndex].s && (
            <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
              {QUESTIONS[qIndex].s}
            </p>
          )}
          <div className="mt-6 space-y-2.5">
            {QUESTIONS[qIndex].o.map((opt) => (
              <button
                key={opt[0]}
                onClick={() => answer(opt)}
                className="surface w-full rounded-2xl border px-4 py-3.5 text-left text-[15px] font-semibold transition hover:shadow-md active:scale-[0.985]"
              >
                {opt[0]}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* RESULT */}
      {screen === "result" && (
        <section className="animate-rise flex flex-1 flex-col">
          <div className="flex items-center gap-2.5">
            <Logo size={38} />
            <span className="text-[16px] font-extrabold tracking-tight">
              Bet<span style={{ color: "var(--green)" }}>Free</span>
            </span>
          </div>
          <div className="mt-6">
            <span
              className="mono inline-block rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.1em]"
              style={
                risk >= 16
                  ? { background: "var(--ember-soft)", borderColor: "var(--ember-soft-border)", color: "var(--ember-deep)" }
                  : risk >= 9
                    ? { background: "var(--amber-soft)", borderColor: "var(--amber-soft-border)", color: "var(--amber-text)" }
                    : { background: "var(--green-soft)", borderColor: "var(--green-soft-border)", color: "var(--green-deep)" }
              }
            >
              {risk >= 16 ? "HIGH RISK" : risk >= 9 ? "ELEVATED RISK" : "LOWER RISK"}
            </span>
            <div className="mono mt-4 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--green)" }}>
              Your projection
            </div>
            <div className="mono loss-num mt-1 font-semibold leading-none tracking-tight" style={{ color: "var(--ember-deep)" }}>
              {fmtMoney(animLoss, currency)}
            </div>
            <div className="mt-1.5 text-[14px]" style={{ color: "var(--muted)" }}>
              estimated loss over the next 5 years if you keep going at this pace
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ...(fiveYr >= 20000 ? ["🚗 a used car"] : fiveYr >= 8000 ? ["🚗 a solid car down payment"] : []),
                ...(fiveYr >= 5000 ? [`✈️ ${Math.max(1, Math.floor(fiveYr / 1500))} trips abroad`] : []),
                `📱 ${Math.max(1, Math.floor(fiveYr / 1000))}× a new phone`,
              ].map((c) => (
                <span key={c} className="surface rounded-full border px-3.5 py-2 text-[13px] font-semibold">
                  {c}
                </span>
              ))}
            </div>

            <Card className="mt-4 p-5">
              <h3 className="text-[15px] font-extrabold">
                {risk >= 16
                  ? "Your answers show a pattern of a serious problem"
                  : risk >= 9
                    ? "Betting is slowly taking control"
                    : "You still have control — keep it"}
              </h3>
              <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
                {risk >= 16
                  ? "Chasing losses, hiding it and feeling regret are the signs experts link to problem gambling. This app can help with daily discipline, but with a result like this the strongest move is also talking to a professional — you'll find resources inside."
                  : risk >= 9
                    ? "You're not in the worst phase, but patterns like chasing losses and regular betting show the habit is growing. Now is the easiest time to stop — every month you wait raises the price."
                    : "Your answers don't show a severe addiction, but money is still leaking away. Quitting now means you'll never find out what the worse phase looks like."}
              </p>
            </Card>

            <Card className="mt-3 p-5">
              <h3 className="text-[15px] font-extrabold">Your plan</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
                Day 1: self-exclude from every bookmaker (guide inside the app). Week 1: install a blocker + remove saved cards. Every day: the counter shows what you&apos;ve saved, and the panic button walks you through urges. The first 30 days are the hardest — after that your brain starts to reset.
              </p>
            </Card>
          </div>
          <div className="mt-auto pt-6">
            <button
              onClick={enterDash}
              className="w-full rounded-2xl py-4 text-[16px] font-extrabold text-white transition active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))", boxShadow: "0 8px 24px rgba(47,122,88,0.35)" }}
            >
              Start your first bet-free day
            </button>
          </div>
        </section>
      )}

      {/* ============ DASH TABS ============ */}
      {screen === "dash" && (
        <>
          {/* HOME */}
          {tab === "home" && (
            <section className="animate-rise flex flex-1 flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar me={me} size={46} />
                  <div>
                    <div className="text-[17px] font-extrabold leading-tight tracking-tight">
                      Hello, {displayName} 👋
                    </div>
                    <div className="text-[12.5px] font-medium" style={{ color: "var(--muted)" }}>
                      Welcome to BetFree
                    </div>
                  </div>
                </div>
                <ThemeToggle />
              </div>

              <Card className="mt-5 p-6 text-center">
                <div className="mono text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                  Bet-free for
                </div>
                <div className="mono streak-num mt-2 font-semibold leading-none tracking-tight">
                  {streakDays}d {h}:{m}:{sec}
                </div>
                <button
                  onClick={() => setSheet("slip")}
                  className="mt-3 text-[12px] font-semibold underline-offset-2 hover:underline"
                  style={{ color: "var(--muted)" }}
                >
                  I placed a bet — restart my counter
                </button>
              </Card>

              <Card className="mt-3 p-5" style={{ borderColor: "var(--green-soft-border)" }}>
                <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--green)" }}>
                  Today&apos;s motivation · day {streakDays}
                </div>
                <p className="mt-2 text-[15px] font-semibold leading-relaxed">{message.text}</p>
              </Card>

              <div
                className="mt-3 rounded-3xl p-6 text-center text-white"
                style={{ background: "linear-gradient(135deg, var(--green-deep), var(--green))", boxShadow: "0 12px 32px rgba(31,90,64,0.3)" }}
              >
                <div className="mono saved-num font-semibold leading-none">{fmtMoney(saved, currency, 2)}</div>
                <div className="mt-1.5 text-[13px] font-medium" style={{ color: "#cde9da" }}>
                  saved since you quit · growing every second
                </div>
                {goalAmount > 0 && (
                  <div className="mt-4 text-left">
                    <div className="flex items-center justify-between text-[12px] font-semibold" style={{ color: "#cde9da" }}>
                      <span>🎯 {goalName || "My goal"}</span>
                      <span className="mono">
                        {Math.floor(goalPct)}% of {fmtMoney(goalAmount, currency)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.25)" }}>
                      <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${goalPct}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Card className="p-4 text-center">
                  <div className="mono text-[20px] font-semibold">{urges}</div>
                  <div className="mt-0.5 text-[12px] font-semibold" style={{ color: "var(--muted)" }}>
                    urges overcome
                  </div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="mono text-[20px] font-semibold">{fmtMoney(spend * 52, currency)}</div>
                  <div className="mt-0.5 text-[12px] font-semibold" style={{ color: "var(--muted)" }}>
                    saved in 1 year
                  </div>
                </Card>
              </div>

              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {milestones(streakDays).map((ms) => (
                  <div
                    key={ms.days}
                    className="mono flex-shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-semibold"
                    style={
                      ms.reached
                        ? { background: "var(--green-soft)", borderColor: "var(--green-soft-border)", color: "var(--green-deep)" }
                        : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--muted)", opacity: 0.75 }
                    }
                  >
                    {ms.reached ? "✓" : "·"} {ms.days >= 30 ? `${Math.round(ms.days / 30)}mo` : `${ms.days}d`}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setPanic(true)}
                className="mt-4 w-full rounded-3xl py-5 text-[18px] font-extrabold tracking-tight text-white transition active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, var(--ember), var(--ember-deep))", boxShadow: "0 12px 32px rgba(217,106,72,0.35)" }}
              >
                ⚡ I HAVE AN URGE — HELP ME
              </button>

              <button
                onClick={() => {
                  setLogged(false);
                  setSheet("log");
                }}
                className="surface mt-3 flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-[15px] font-semibold transition hover:shadow-md"
              >
                Log an urge to your journal
                <span style={{ color: "var(--muted)" }}>→</span>
              </button>
            </section>
          )}

          {/* JOURNAL */}
          {tab === "journal" && (
            <section className="animate-rise flex flex-1 flex-col">
              <h1 className="text-[24px] font-extrabold tracking-tight">Urge journal</h1>
              <p className="mt-1 text-[13.5px]" style={{ color: "var(--muted)" }}>
                Spot your patterns — most urges come from the same few triggers.
              </p>

              <Card className="mt-5 p-5">
                <div className="mono text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
                  Last 7 days
                </div>
                {history === null ? (
                  <p className="mt-4 text-[14px] font-semibold" style={{ color: "var(--muted)" }}>
                    Loading…
                  </p>
                ) : (
                  <div className="mt-4 flex items-end gap-1.5" style={{ height: 64 }}>
                    {Array.from({ length: 7 }, (_, i) => {
                      const day = new Date();
                      day.setHours(0, 0, 0, 0);
                      day.setDate(day.getDate() - (6 - i));
                      const next = new Date(day);
                      next.setDate(day.getDate() + 1);
                      const counts = Array.from({ length: 7 }, (_, j) => {
                        const d2 = new Date();
                        d2.setHours(0, 0, 0, 0);
                        d2.setDate(d2.getDate() - (6 - j));
                        const n2 = new Date(d2);
                        n2.setDate(d2.getDate() + 1);
                        return history.filter((u) => {
                          const t = new Date(u.createdAt).getTime();
                          return t >= d2.getTime() && t < n2.getTime();
                        }).length;
                      });
                      const count = counts[i];
                      const max = Math.max(1, ...counts);
                      return (
                        <div key={i} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className="w-full rounded-md transition-all"
                            style={{
                              height: `${Math.max(6, (count / max) * 48)}px`,
                              background: count > 0 ? "var(--green)" : "var(--line)",
                              opacity: count > 0 ? 0.9 : 0.6,
                            }}
                          />
                          <span className="mono text-[10px]" style={{ color: "var(--muted)" }}>
                            {day.toLocaleDateString("en-GB", { weekday: "narrow" })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card className="mt-3 flex-1 p-5">
                <div className="mono text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
                  All logged urges
                </div>
                {history !== null && history.length === 0 && (
                  <p className="mt-4 text-[14px] font-semibold" style={{ color: "var(--muted)" }}>
                    Nothing logged yet. Beating an urge and logging it counts double.
                  </p>
                )}
                {history !== null &&
                  history.slice(0, 30).map((u, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 border-b py-2.5 text-[13.5px] last:border-b-0" style={{ borderColor: "var(--line)" }}>
                      <span className="font-semibold" style={{ color: "var(--ink-soft)" }}>
                        {u.trigger || "Urge overcome"}
                      </span>
                      <span className="mono flex-shrink-0 text-[11.5px]" style={{ color: "var(--muted)" }}>
                        {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
              </Card>

              <button
                onClick={() => {
                  setLogged(false);
                  setSheet("log");
                }}
                className="mt-4 w-full rounded-2xl py-4 text-[15px] font-extrabold text-white transition active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))", boxShadow: "0 8px 24px rgba(47,122,88,0.3)" }}
              >
                + Log an urge
              </button>
            </section>
          )}

          {/* SUPPORT */}
          {tab === "support" && (
            <section className="animate-rise flex flex-1 flex-col">
              <h1 className="text-[24px] font-extrabold tracking-tight">Support & tools</h1>
              <p className="mt-1 text-[13.5px]" style={{ color: "var(--muted)" }}>
                The strongest moves you can make outside this app.
              </p>

              <Card className="mt-5 p-5">
                <h3 className="text-[16px] font-extrabold">Self-exclusion — step by step</h3>
                {EXCLUSION_STEPS.map((step, i) => (
                  <div key={i} className="flex gap-3 border-b py-3 text-[14px] leading-relaxed last:border-b-0" style={{ borderColor: "var(--line)" }}>
                    <span className="mono mt-0.5 flex-shrink-0 text-[13px] font-semibold" style={{ color: "var(--green)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{ color: "var(--ink-soft)" }}>{step}</span>
                  </div>
                ))}
              </Card>

              <Card className="mt-3 p-5">
                <h3 className="text-[16px] font-extrabold">Professional help</h3>
                {HELP_RESOURCES.map(([title, desc]) => (
                  <div key={title} className="flex gap-3 border-b py-3 text-[14px] leading-relaxed last:border-b-0" style={{ borderColor: "var(--line)" }}>
                    <span className="mono mt-0.5 flex-shrink-0" style={{ color: "var(--green)" }}>→</span>
                    <span style={{ color: "var(--ink-soft)" }}>
                      <b style={{ color: "var(--ink)" }}>{title}</b> — {desc}
                    </span>
                  </div>
                ))}
                <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  If you feel the situation is seriously affecting your mental health, don&apos;t wait — contact a doctor or counsellor as soon as possible.
                </p>
              </Card>

              <div className="mt-auto pt-6 text-center text-[11.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
                BetFree is not a substitute for professional help. If gambling has seriously affected your finances or relationships, reach out to a professional.
              </div>
            </section>
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <section className="animate-rise flex flex-1 flex-col">
              <h1 className="text-[24px] font-extrabold tracking-tight">Profile & settings</h1>

              <Card className="mt-5 p-5">
                <div className="flex items-center gap-4">
                  <button onClick={() => fileRef.current?.click()} aria-label="Change profile photo" className="relative">
                    <Avatar me={me} size={72} />
                    <span
                      className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-white"
                      style={{ background: "var(--green)", boxShadow: "var(--shadow-card)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                  <div className="min-w-0">
                    <div className="truncate text-[16px] font-extrabold">
                      {[me?.user.firstName, me?.user.lastName].filter(Boolean).join(" ") || me?.user.name}
                    </div>
                    <div className="truncate text-[13px]" style={{ color: "var(--muted)" }}>
                      {me?.user.email}
                    </div>
                    <button onClick={() => fileRef.current?.click()} className="mt-1 text-[12.5px] font-bold underline-offset-2 hover:underline" style={{ color: "var(--green)" }}>
                      {me?.user.avatar ? "Change photo" : "Add photo (optional)"}
                    </button>
                  </div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickAvatar(f);
                    e.target.value = "";
                  }}
                />

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="fn" className={labelCls} style={{ color: "var(--ink-soft)" }}>
                      First name
                    </label>
                    <input id="fn" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="ln" className={labelCls} style={{ color: "var(--ink-soft)" }}>
                      Last name
                    </label>
                    <input id="ln" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={inputCls} />
                  </div>
                </div>
                <div className="mt-3">
                  <label htmlFor="ph" className={labelCls} style={{ color: "var(--ink-soft)" }}>
                    Phone <span className="font-medium" style={{ color: "var(--muted)" }}>(optional)</span>
                  </label>
                  <input id="ph" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+385 ..." className={inputCls} />
                </div>
                <button
                  onClick={() => saveAccount()}
                  className="mt-4 w-full rounded-2xl py-3 text-[14px] font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))" }}
                >
                  Save profile
                </button>
                {profileSaved && (
                  <p className="animate-rise mt-2.5 text-center text-[13px] font-bold" style={{ color: profileSaved === "Saved ✓" ? "var(--green)" : "var(--ember-deep)" }}>
                    {profileSaved}
                  </p>
                )}
              </Card>

              <Card className="mt-3 p-5">
                <div className={labelCls} style={{ color: "var(--ink-soft)" }}>
                  Currency
                </div>
                <div className="flex gap-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCurrency(c.code);
                        saveProfile({ currency: c.code });
                      }}
                      className="mono flex-1 rounded-2xl border py-2.5 text-[14px] font-semibold transition"
                      style={
                        currency === c.code
                          ? { background: "var(--green-soft)", borderColor: "var(--green-soft-border)", color: "var(--green-deep)" }
                          : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--muted)" }
                      }
                    >
                      {c.symbol} {c.code}
                    </button>
                  ))}
                </div>

                <div className={labelCls + " mt-5"} style={{ color: "var(--ink-soft)" }}>
                  Savings goal
                </div>
                <input type="text" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Goal name (e.g. Trip to Italy)" className={inputCls} />
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={goalAmount || ""}
                  onChange={(e) => setGoalAmount(Number(e.target.value) || 0)}
                  placeholder="Amount"
                  className={inputCls + " mt-2"}
                />
                <button
                  onClick={() => saveProfile({ goalName, goalAmount })}
                  className="surface mt-3 w-full rounded-2xl border py-3 text-[14px] font-bold"
                  style={{ color: "var(--ink-soft)" }}
                >
                  Save goal
                </button>
              </Card>

              <Card className="mt-3 p-5">
                {me && me.profile.relapses > 0 && (
                  <p className="mb-3 text-[12.5px]" style={{ color: "var(--muted)" }}>
                    Restarts so far: {me.profile.relapses}. Every restart is proof you keep coming back to the fight.
                  </p>
                )}
                <button
                  onClick={() => setSheet("slip")}
                  className="surface w-full rounded-2xl border py-3 text-[14px] font-bold"
                  style={{ color: "var(--ember-deep)", borderColor: "var(--ember-soft-border)" }}
                >
                  I placed a bet — restart my counter
                </button>
                <button onClick={logout} className="mt-2.5 w-full rounded-2xl py-3 text-[14px] font-extrabold text-white" style={{ background: "var(--nav-bg)" }}>
                  Sign out
                </button>
              </Card>
            </section>
          )}

          <BottomNav tab={tab} setTab={setTab} />
        </>
      )}

      {/* PANIC OVERLAY */}
      {panic && (
        <PanicOverlay
          onClose={(won) => {
            setPanic(false);
            if (won) logUrge("panic button");
          }}
        />
      )}

      {/* SHEETS */}
      {sheet && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setSheet("")}>
          <div
            className="safe-sheet animate-rise max-h-[85dvh] w-full max-w-md overflow-auto overscroll-contain rounded-t-[28px] p-6"
            style={{ background: "var(--surface-solid)", boxShadow: "0 -12px 40px rgba(0,0,0,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {sheet === "log" && (
              <>
                <h3 className="text-[19px] font-extrabold">What triggered the urge?</h3>
                <div className="mt-4 space-y-2.5">
                  {TRIGGERS.map((t) => (
                    <button
                      key={t}
                      onClick={() => logUrge(t)}
                      className="surface w-full rounded-2xl border px-4 py-3.5 text-left text-[15px] font-semibold transition hover:shadow-md"
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {logged && (
                  <div
                    className="animate-rise mt-4 rounded-2xl border px-4 py-3 text-[14px] font-semibold"
                    style={{ background: "var(--green-soft)", borderColor: "var(--green-soft-border)", color: "var(--green-deep)" }}
                  >
                    Logged. Every urge you write down instead of betting on is a win.
                  </div>
                )}
                <button
                  onClick={() => setSheet("")}
                  className="surface mt-5 w-full rounded-2xl border py-3.5 text-[15px] font-bold transition hover:shadow-md"
                  style={{ color: "var(--ink-soft)" }}
                >
                  Close
                </button>
              </>
            )}

            {sheet === "slip" && (
              <>
                <h3 className="text-[19px] font-extrabold">You slipped. You&apos;re still in the game.</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                  A slip is a moment, not an identity. Everything you built — the urges you beat, the days you stacked — still happened and still counts. The most important bet-free day of your life is always the next one.
                </p>
                <p className="mt-2.5 text-[14.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  Restarting your counter takes courage. Your urge history and totals stay untouched.
                </p>
                <button
                  onClick={confirmSlip}
                  className="mt-5 w-full rounded-2xl py-3.5 text-[15px] font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))" }}
                >
                  Restart my counter — day one, again
                </button>
                <button
                  onClick={() => setSheet("")}
                  className="surface mt-2.5 w-full rounded-2xl border py-3.5 text-[14px] font-bold"
                  style={{ color: "var(--muted)" }}
                >
                  Wait — I didn&apos;t actually bet
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------------- panic overlay ---------------- */

function PanicOverlay({ onClose }: { onClose: (won: boolean) => void }) {
  const [t, setT] = useState(60);
  const done = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setT((v) => {
        if (v <= 1) {
          clearInterval(id);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="safe-overlay fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-8 text-center" style={{ background: "var(--overlay)" }}>
      <div className="mono text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--green)" }}>
        An urge lasts 15–20 minutes. This will pass.
      </div>
      <div className="mono mt-3 text-[32px] font-semibold">{t === 0 ? "0:00 ✓" : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`}</div>
      <div
        className="breathe my-7 flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold sm:h-40 sm:w-40"
        style={{
          background: "radial-gradient(circle, rgba(47,122,88,0.25), rgba(47,122,88,0.05))",
          border: "2px solid var(--green)",
          color: "var(--green)",
        }}
      >
        breathe
      </div>
      <p className="max-w-[290px] text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
        Breathe in as the circle grows, breathe out as it shrinks. You don&apos;t have to beat betting forever — just for the next 60 seconds.
      </p>
      <div className="mt-8 w-full max-w-sm space-y-2.5">
        <button
          onClick={() => {
            if (done.current) return;
            done.current = true;
            onClose(true);
          }}
          className="w-full rounded-2xl py-4 text-[16px] font-extrabold text-white transition active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))", boxShadow: "0 8px 24px rgba(47,122,88,0.35)" }}
        >
          I made it ✓
        </button>
        <button onClick={() => onClose(false)} className="surface w-full rounded-2xl border py-3.5 text-[15px] font-bold" style={{ color: "var(--muted)" }}>
          Close
        </button>
      </div>
    </div>
  );
}
