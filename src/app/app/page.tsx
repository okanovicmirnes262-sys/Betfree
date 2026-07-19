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
  debtAmount: number;
  dangerHours: string;
};

type Reason = { id: number; text: string };
type Checkin = { day: string; mood: number; hadUrge: boolean };
type Post = { id: number; nickname: string; tag: string; streakDays: number; text: string; createdAt: string; cheers: number; mine: boolean };

/** Local calendar day (YYYY-MM-DD) — NOT UTC, so midnight works in every timezone. */
function localDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Me = {
  user: {
    id: number;
    name: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    avatar: string;
    emailVerified: boolean;
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

type Tab = "home" | "journal" | "community" | "support" | "profile";

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
      id: "community",
      label: "Community",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" />
          <circle cx="17.5" cy="9.5" r="2.6" />
          <path d="M16.5 14.7c2.9.4 5 2.2 5 5.3" />
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
  const fileRef = useRef<HTMLInputElement>(null);

  // save-confirmation toast
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((text: string, error = false) => {
    setToast({ text, error });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // recovery features
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [newReason, setNewReason] = useState("");
  const [checkins, setCheckins] = useState<Checkin[] | null>(null);
  const [checkinMood, setCheckinMood] = useState(0);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [newPost, setNewPost] = useState("");
  const [postErr, setPostErr] = useState("");
  const [retryUntil, setRetryUntil] = useState(0);
  const [customTrigger, setCustomTrigger] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [hiddenPosts, setHiddenPosts] = useState<number[]>([]);
  const [debtAmount, setDebtAmount] = useState(0);
  const [dangerDays, setDangerDays] = useState<number[]>([]);
  const [dangerFrom, setDangerFrom] = useState(18);
  const [dangerTo, setDangerTo] = useState(23);

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
    setDebtAmount(data.profile?.debtAmount ?? 0);
    try {
      const d = JSON.parse(data.profile?.dangerHours || "");
      setDangerDays(Array.isArray(d.days) ? d.days : []);
      if (typeof d.from === "number") setDangerFrom(d.from);
      if (typeof d.to === "number") setDangerTo(d.to);
    } catch {
      setDangerDays([]);
    }
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
    // coarse clock for slow-changing things (message, milestones, danger window);
    // the per-second streak/savings tickers are isolated components below
    const id = setInterval(() => setNow(Date.now()), 30000);
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

  // reasons + check-ins load once with the session
  useEffect(() => {
    fetch("/api/reasons")
      .then((r) => r.json())
      .then((r) => setReasons(r?.reasons ?? []))
      .catch(() => {});
    fetch("/api/checkin")
      .then((r) => r.json())
      .then((r) => setCheckins(r?.entries ?? []))
      .catch(() => setCheckins([]));
  }, []);

  // community posts load when the tab opens
  useEffect(() => {
    if (tab === "community" && posts === null) {
      fetch("/api/community")
        .then((r) => r.json())
        .then((r) => setPosts(r?.posts ?? []))
        .catch(() => setPosts([]));
    }
  }, [tab, posts]);

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

  const saveProfile = useCallback(async (body: Record<string, unknown>) => {
    try {
      const r = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return r.ok;
    } catch {
      return false;
    }
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
    notify("Urge logged — that's a win 💪");
  }

  async function confirmSlip() {
    await saveProfile({ relapse: true });
    await loadMe();
    setSheet("");
    setTab("home");
  }

  async function saveAccount(extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, ...extra }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) {
      await loadMe();
      return true;
    }
    notify(res?.error || "Could not save. Try again.", true);
    return false;
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
        // JPEG has no alpha — fill white so transparent PNGs don't turn black
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        saveAccount({ avatar: dataUrl }).then((ok) => {
          if (ok) notify("Profile photo updated 📸");
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function submitCheckin(mood: number, hadUrge: boolean) {
    setCheckinMood(0);
    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, hadUrge, day: localDay() }),
    }).catch(() => {});
    const r = await fetch("/api/checkin").then((r) => r.json()).catch(() => null);
    if (r) setCheckins(r.entries ?? []);
    notify("Check-in saved — see you tomorrow 🌱");
  }

  async function addReason() {
    const text = newReason.trim();
    if (!text) return;
    setNewReason("");
    const r = await fetch("/api/reasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then((r) => r.json()).catch(() => null);
    if (r?.ok) {
      setReasons((prev) => [...prev, { id: r.id, text }]);
      notify("Reason added ✍️");
    } else {
      notify(r?.error || "Could not save. Try again.", true);
    }
  }

  async function delReason(id: number) {
    setReasons((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/reasons?id=${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function submitPost() {
    const text = newPost.trim();
    if (!text) return;
    setPostErr("");
    const r = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then((r) => r.json()).catch(() => null);
    if (r?.ok) {
      setNewPost("");
      setPosts(null); // refetch
    } else if (r?.retryIn) {
      setRetryUntil(Date.now() + r.retryIn * 1000);
    } else {
      setPostErr(r?.error || "Could not post. Try again.");
    }
  }

  async function cheerPost(post: Post) {
    if (post.mine) return;
    setPosts((prev) => prev?.map((p) => (p.id === post.id ? { ...p, cheers: p.cheers + 1, mine: true } : p)) ?? null);
    await fetch("/api/community/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id, kind: "cheer" }),
    }).catch(() => {});
  }

  async function flagPost(post: Post) {
    setHiddenPosts((prev) => [...prev, post.id]);
    await fetch("/api/community/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id, kind: "flag" }),
    }).catch(() => {});
  }

  async function saveDangerHours(days: number[], from: number, to: number) {
    const value = days.length === 0 ? "" : JSON.stringify({ days, from, to });
    const ok = await saveProfile({ dangerHours: value });
    notify(ok ? "Risky hours saved ⚠️" : "Could not save. Try again.", !ok);
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

  const todayKey = localDay();
  const doneToday = checkins?.some((e) => e.day === todayKey) ?? true;
  const sortedCheckins = checkins ? [...checkins].sort((a, b) => (a.day < b.day ? 1 : -1)) : [];
  const lowMoodRun = sortedCheckins.length >= 3 && sortedCheckins.slice(0, 3).every((e) => e.mood === 1);

  const nowDate = new Date(now);
  const dangerActive =
    dangerDays.includes(nowDate.getDay()) && nowDate.getHours() >= dangerFrom && nowDate.getHours() < dangerTo;

  const debtWeeks = debtAmount > 0 && spend > 0 ? debtAmount / spend : 0;
  const debtFreeDate = new Date(now + debtWeeks * 7 * 86400000);
  const debtMonths = Math.max(1, Math.round(debtWeeks / 4.345));

  const inputCls = "surface w-full rounded-2xl border px-4 py-3 font-medium outline-none";
  const labelCls = "mb-1.5 block text-[13px] font-bold";

  return (
    <main className={"safe-main mx-auto flex min-h-dvh w-full max-w-md flex-col" + (screen === "dash" ? " with-nav" : "")}>
      {toast && (
        <div className={"toast" + (toast.error ? " error" : "")} role="status">
          {toast.text}
        </div>
      )}
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

              {dangerActive && (
                <div
                  className="animate-rise mt-5 rounded-3xl p-5"
                  style={{ background: "var(--ember-soft)", border: "1px solid var(--ember-soft-border)" }}
                >
                  <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--ember-deep)" }}>
                    ⚠️ You&apos;re in your risky hours
                  </div>
                  <p className="mt-1.5 text-[14px] font-semibold leading-relaxed">
                    This is when urges usually hit you. Have a plan: keep your phone busy, and if it gets loud in your head — the panic button is right below.
                  </p>
                  <button
                    onClick={() => setPanic(true)}
                    className="mt-3 w-full rounded-2xl py-3 text-[14px] font-extrabold text-white"
                    style={{ background: "linear-gradient(135deg, var(--ember), var(--ember-deep))" }}
                  >
                    ⚡ Open the panic tool now
                  </button>
                </div>
              )}

              {checkins !== null && !doneToday && (
                <Card className={"p-5 " + (dangerActive ? "mt-3" : "mt-5")}>
                  <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--green)" }}>
                    Daily check-in
                  </div>
                  {checkinMood === 0 ? (
                    <>
                      <p className="mt-2 text-[15px] font-semibold">How are you feeling today?</p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {[
                          [3, "😊", "Good"],
                          [2, "😐", "Okay"],
                          [1, "😟", "Rough"],
                        ].map(([v, e, l]) => (
                          <button
                            key={v}
                            onClick={() => setCheckinMood(v as number)}
                            className="surface rounded-2xl border py-3 text-center transition hover:shadow-md active:scale-[0.97]"
                          >
                            <div className="text-[24px]">{e}</div>
                            <div className="mt-0.5 text-[12px] font-bold" style={{ color: "var(--muted)" }}>
                              {l}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-[15px] font-semibold">Did you feel an urge to bet today?</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => submitCheckin(checkinMood, true)}
                          className="surface rounded-2xl border py-3 text-[14px] font-bold transition hover:shadow-md"
                        >
                          Yes, I did
                        </button>
                        <button
                          onClick={() => submitCheckin(checkinMood, false)}
                          className="rounded-2xl py-3 text-[14px] font-extrabold text-white transition active:scale-[0.97]"
                          style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))" }}
                        >
                          No urges
                        </button>
                      </div>
                    </>
                  )}
                </Card>
              )}

              {lowMoodRun && (
                <Card className="mt-3 p-5" style={{ borderColor: "var(--amber-soft-border)" }}>
                  <p className="text-[14px] font-semibold leading-relaxed">
                    Three rough days in a row. That&apos;s heavy — and it&apos;s exactly when talking to someone helps most.{" "}
                    <button onClick={() => setTab("support")} className="font-extrabold underline underline-offset-2" style={{ color: "var(--green)" }}>
                      See support options →
                    </button>
                  </p>
                </Card>
              )}

              <Card className={"p-6 text-center " + (dangerActive || (checkins !== null && !doneToday) || lowMoodRun ? "mt-3" : "mt-5")}>
                <div className="mono text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                  Bet-free for
                </div>
                <div className="mono streak-num mt-2 font-semibold leading-none tracking-tight">
                  <LiveStreak quitStart={quitStart} />
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
                <div className="mono saved-num font-semibold leading-none">
                  <LiveSaved quitStart={quitStart} spend={spend} currency={currency} />
                </div>
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

              {debtAmount > 0 && spend > 0 && (
                <Card className="mt-3 p-5">
                  <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                    💰 Your road to debt-free
                  </div>
                  <div className="mt-2 text-[22px] font-extrabold tracking-tight">
                    {debtFreeDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                  </div>
                  <p className="mt-1 text-[13.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
                    If every euro you used to bet goes to your {fmtMoney(debtAmount, currency)} debt instead, you&apos;re free in about{" "}
                    <b style={{ color: "var(--ink)" }}>{debtMonths} months</b>. Keep betting and that date never comes.
                  </p>
                </Card>
              )}

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

              <Card className="mt-3 p-5">
                <div className="mono text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
                  Mood · last 14 days
                </div>
                {checkins === null || checkins.length === 0 ? (
                  <p className="mt-3 text-[13.5px] font-semibold" style={{ color: "var(--muted)" }}>
                    No check-ins yet — answer the daily question on Home and watch your mood climb as the streak grows.
                  </p>
                ) : (
                  <div className="mt-4 flex items-end gap-1" style={{ height: 60 }}>
                    {Array.from({ length: 14 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (13 - i));
                      const key = localDay(d);
                      const entry = checkins.find((e) => e.day === key);
                      const mood = entry?.mood ?? 0;
                      const color = mood === 3 ? "var(--green)" : mood === 2 ? "var(--amber)" : mood === 1 ? "var(--ember)" : "var(--line)";
                      return (
                        <div key={i} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className="w-full rounded-sm"
                            style={{ height: `${mood === 0 ? 5 : 10 + mood * 13}px`, background: color, opacity: mood === 0 ? 0.5 : 0.9 }}
                            title={key}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-2 flex gap-3 text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
                  <span>😊 <span style={{ color: "var(--green)" }}>■</span></span>
                  <span>😐 <span style={{ color: "var(--amber)" }}>■</span></span>
                  <span>😟 <span style={{ color: "var(--ember)" }}>■</span></span>
                </div>
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

          {/* COMMUNITY */}
          {tab === "community" && (
            <section className="animate-rise flex flex-1 flex-col">
              <h1 className="text-[24px] font-extrabold tracking-tight">Community</h1>
              <p className="mt-1 text-[13.5px]" style={{ color: "var(--muted)" }}>
                Anonymous wall. Only your nickname shows. You are not the only one fighting this.
              </p>

              <Card className="mt-5 p-4">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value.slice(0, 220))}
                  placeholder={`Share a win or a hard moment — e.g. "Day ${streakDays}: watched the match without a single bet."`}
                  rows={2}
                  className="w-full resize-none border-none bg-transparent font-medium outline-none"
                  style={{ color: "var(--ink)" }}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="mono text-[11px]" style={{ color: "var(--muted)" }}>
                    {newPost.length}/220
                  </span>
                  <button
                    onClick={submitPost}
                    disabled={!newPost.trim() || retryUntil > 0}
                    className="rounded-full px-5 py-2 text-[13px] font-extrabold text-white disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))" }}
                  >
                    Share
                  </button>
                </div>
                {retryUntil > 0 ? (
                  <CooldownMsg
                    until={retryUntil}
                    onDone={() => {
                      setRetryUntil(0);
                      setPostErr("");
                    }}
                  />
                ) : (
                  postErr && (
                    <p className="animate-rise mt-2 text-[12.5px] font-bold" style={{ color: "var(--ember-deep)" }}>
                      {postErr}
                    </p>
                  )
                )}
              </Card>

              <div className="mt-3 space-y-2.5">
                {posts === null && (
                  <p className="text-[14px] font-semibold" style={{ color: "var(--muted)" }}>
                    Loading…
                  </p>
                )}
                {posts !== null && posts.filter((p) => !hiddenPosts.includes(p.id)).length === 0 && (
                  <Card className="p-5">
                    <p className="text-[14px] font-semibold" style={{ color: "var(--muted)" }}>
                      No posts yet. Be the first — your day count might be exactly what someone else needs to see.
                    </p>
                  </Card>
                )}
                {posts
                  ?.filter((p) => !hiddenPosts.includes(p.id))
                  .map((p) => (
                    <Card key={p.id} className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="truncate text-[14px] font-extrabold">
                            {p.nickname}
                            <span className="mono ml-1 text-[10.5px] font-semibold" style={{ color: "var(--muted)" }}>
                              #{p.tag}
                            </span>
                          </span>
                          <span
                            className="mono flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                            style={{ background: "var(--green-soft)", color: "var(--green-deep)" }}
                          >
                            day {p.streakDays}
                          </span>
                        </div>
                        <span className="mono flex-shrink-0 text-[11px]" style={{ color: "var(--muted)" }}>
                          {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[14.5px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                        {p.text}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <button
                          onClick={() => cheerPost(p)}
                          className="rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition active:scale-95"
                          style={
                            p.mine
                              ? { background: "var(--green-soft)", borderColor: "var(--green-soft-border)", color: "var(--green-deep)" }
                              : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--muted)" }
                          }
                        >
                          💪 {p.cheers > 0 ? p.cheers : ""}
                        </button>
                        <button onClick={() => flagPost(p)} className="text-[11.5px] font-semibold" style={{ color: "var(--muted)" }}>
                          Report
                        </button>
                      </div>
                    </Card>
                  ))}
              </div>
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

              {me && !me.user.emailVerified && (
                <Card className="mt-5 p-5" style={{ borderColor: "var(--amber-soft-border)" }}>
                  <div className="text-[14px] font-extrabold">📧 Verify your email</div>
                  <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
                    Confirm your email so you can reset your password if you ever forget it. Check your inbox for the
                    link — or send a new one.
                  </p>
                  <button
                    onClick={async () => {
                      setVerifyMsg("");
                      const r = await fetch("/api/auth/send-verify", { method: "POST" })
                        .then((r) => r.json())
                        .catch(() => null);
                      setVerifyMsg(r?.ok ? "Verification email sent ✓" : r?.error || "Could not send. Try again.");
                      setTimeout(() => setVerifyMsg(""), 4000);
                    }}
                    className="surface mt-3 w-full rounded-2xl border py-2.5 text-[13.5px] font-bold"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    Resend verification email
                  </button>
                  {verifyMsg && (
                    <p className="animate-rise mt-2 text-center text-[12.5px] font-bold" style={{ color: verifyMsg.includes("✓") ? "var(--green)" : "var(--ember-deep)" }}>
                      {verifyMsg}
                    </p>
                  )}
                </Card>
              )}

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
                <SaveButton
                  label="Save profile"
                  variant="primary"
                  onSave={async () => {
                    const ok = await saveAccount();
                    if (ok) notify("Profile saved ✓");
                    return ok;
                  }}
                />
              </Card>

              <Card className="mt-3 p-5">
                <div className={labelCls} style={{ color: "var(--ink-soft)" }}>
                  Currency
                </div>
                <div className="flex gap-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={async () => {
                        setCurrency(c.code);
                        const ok = await saveProfile({ currency: c.code });
                        notify(ok ? `Currency set to ${c.symbol} ${c.code}` : "Could not save. Try again.", !ok);
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
                <SaveButton
                  label="Save goal"
                  onSave={async () => {
                    const ok = await saveProfile({ goalName, goalAmount });
                    notify(ok ? "Goal saved — watch it fill up on Home 🎯" : "Could not save. Try again.", !ok);
                    return ok;
                  }}
                />
              </Card>

              <Card className="mt-3 p-5">
                <div className={labelCls} style={{ color: "var(--ink-soft)" }}>
                  ✍️ My reasons for quitting
                </div>
                <p className="mb-3 text-[12.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  Written by the clear-headed you, shown to the struggling you — these appear on the panic screen when an urge hits.
                </p>
                {reasons.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3 border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--line)" }}>
                    <span className="text-[14px] font-semibold leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                      {r.text}
                    </span>
                    <button onClick={() => delReason(r.id)} aria-label="Delete reason" className="mt-0.5 flex-shrink-0 text-[12px] font-bold" style={{ color: "var(--muted)" }}>
                      ✕
                    </button>
                  </div>
                ))}
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value.slice(0, 200))}
                    placeholder='e.g. "I want my family to trust me again"'
                    className={inputCls + " flex-1"}
                    onKeyDown={(e) => e.key === "Enter" && addReason()}
                  />
                  <button
                    onClick={addReason}
                    disabled={!newReason.trim()}
                    className="rounded-2xl px-4 text-[14px] font-extrabold text-white disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))" }}
                  >
                    Add
                  </button>
                </div>
              </Card>

              <Card className="mt-3 p-5">
                <div className={labelCls} style={{ color: "var(--ink-soft)" }}>
                  💰 Gambling debt <span className="font-medium" style={{ color: "var(--muted)" }}>(optional)</span>
                </div>
                <p className="mb-2.5 text-[12.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  Enter what you owe and the Home screen shows the date you&apos;ll be debt-free if the betting money goes to the debt instead.
                </p>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={debtAmount || ""}
                  onChange={(e) => setDebtAmount(Number(e.target.value) || 0)}
                  placeholder="Total debt amount"
                  className={inputCls}
                />
                <SaveButton
                  label="Save debt"
                  onSave={async () => {
                    const ok = await saveProfile({ debtAmount });
                    notify(ok ? "Debt saved — your debt-free date is on Home 💰" : "Could not save. Try again.", !ok);
                    return ok;
                  }}
                />
              </Card>

              <Card className="mt-3 p-5">
                <div className={labelCls} style={{ color: "var(--ink-soft)" }}>
                  ⚠️ My risky hours
                </div>
                <p className="mb-3 text-[12.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  When do urges usually hit? Pick days and hours — during that window Home shows an extra shield with the panic tool front and centre.
                </p>
                <div className="flex gap-1.5">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const days = dangerDays.includes(i) ? dangerDays.filter((x) => x !== i) : [...dangerDays, i];
                        setDangerDays(days);
                        saveDangerHours(days, dangerFrom, dangerTo);
                      }}
                      className="mono h-10 flex-1 rounded-xl border text-[13px] font-bold transition"
                      style={
                        dangerDays.includes(i)
                          ? { background: "var(--ember-soft)", borderColor: "var(--ember-soft-border)", color: "var(--ember-deep)" }
                          : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--muted)" }
                      }
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <select
                    value={dangerFrom}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDangerFrom(v);
                      saveDangerHours(dangerDays, v, dangerTo);
                    }}
                    className={inputCls + " flex-1"}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        from {String(i).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                  <select
                    value={dangerTo}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDangerTo(v);
                      saveDangerHours(dangerDays, dangerFrom, v);
                    }}
                    className={inputCls + " flex-1"}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        to {String(i + 1).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
              </Card>

              <Card className="mt-3 p-5">
                {(me?.profile?.relapses ?? 0) > 0 && (
                  <p className="mb-3 text-[12.5px]" style={{ color: "var(--muted)" }}>
                    Restarts so far: {me?.profile?.relapses}. Every restart is proof you keep coming back to the fight.
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
                <button
                  onClick={async () => {
                    await fetch("/api/auth/logout-all", { method: "POST" });
                    router.push("/login");
                    router.refresh();
                  }}
                  className="mt-2 w-full rounded-2xl py-2.5 text-[12.5px] font-bold"
                  style={{ color: "var(--muted)" }}
                >
                  Sign out on all devices
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
          reasons={reasons}
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
                <div className="mt-3">
                  <div className="mb-1.5 text-[12.5px] font-bold" style={{ color: "var(--muted)" }}>
                    Something else? Write your own trigger:
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTrigger}
                      onChange={(e) => setCustomTrigger(e.target.value.slice(0, 80))}
                      placeholder='e.g. "Saw my old betting buddy"'
                      className="surface flex-1 rounded-2xl border px-4 py-3 font-medium outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customTrigger.trim()) {
                          logUrge(customTrigger.trim());
                          setCustomTrigger("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (!customTrigger.trim()) return;
                        logUrge(customTrigger.trim());
                        setCustomTrigger("");
                      }}
                      disabled={!customTrigger.trim()}
                      className="rounded-2xl px-4 text-[14px] font-extrabold text-white disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))" }}
                    >
                      Log
                    </button>
                  </div>
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

/**
 * Save button with visible state: idle -> amber "Saving…" -> green "Saved ✓",
 * then back to idle. Disabled while in flight.
 */
function SaveButton({
  label,
  onSave,
  variant = "ghost",
}: {
  label: string;
  onSave: () => Promise<boolean>;
  variant?: "ghost" | "primary";
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function click() {
    if (state !== "idle") return;
    setState("saving");
    const ok = await onSave();
    if (ok) {
      setState("saved");
      setTimeout(() => setState("idle"), 1800);
    } else {
      setState("idle");
    }
  }

  let style: React.CSSProperties;
  let text = label;
  if (state === "saving") {
    text = "Saving…";
    style = { background: "var(--amber-soft)", color: "var(--amber-text)", border: "1px solid var(--amber-soft-border)" };
  } else if (state === "saved") {
    text = "Saved ✓";
    style = { background: "linear-gradient(135deg, var(--green), var(--green-deep))", color: "#fff", border: "1px solid transparent" };
  } else if (variant === "primary") {
    style = { background: "linear-gradient(135deg, var(--green), var(--green-deep))", color: "#fff", border: "1px solid transparent" };
  } else {
    style = { background: "var(--surface)", color: "var(--ink-soft)", border: "1px solid var(--line)" };
  }

  return (
    <button
      onClick={click}
      disabled={state !== "idle"}
      className="mt-3 w-full rounded-2xl py-3 text-[14px] font-extrabold transition-all duration-300 active:scale-[0.98]"
      style={style}
    >
      {text}
    </button>
  );
}

function CooldownMsg({ until, onDone }: { until: number; onDone: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((until - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) {
        clearInterval(id);
        onDone();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [until, onDone]);
  return (
    <p className="animate-rise mt-2 text-[12.5px] font-bold" style={{ color: "var(--amber-text)" }}>
      You can post again in {left}s.
    </p>
  );
}

function LiveStreak({ quitStart }: { quitStart: number }) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((t - quitStart) / 1000));
  const days = Math.floor(s / 86400);
  const h = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return (
    <>
      {days}d {h}:{m}:{sec}
    </>
  );
}

function LiveSaved({ quitStart, spend, currency }: { quitStart: number; spend: number; currency: string }) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((t - quitStart) / 1000));
  return <>{fmtMoney((spend / (7 * 24 * 3600)) * s, currency, 2)}</>;
}

function PanicOverlay({ reasons, onClose }: { reasons: Reason[]; onClose: (won: boolean) => void }) {
  const [t, setT] = useState(60);
  const done = useRef(false);
  const primaryRef = useRef<HTMLButtonElement>(null);

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
    // lock background scroll and move focus into the dialog
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primaryRef.current?.focus();
    return () => {
      clearInterval(id);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Panic tool"
      className="safe-overlay fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-8 text-center"
      style={{ background: "var(--overlay)" }}
    >
      <div className="mono text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--green)" }}>
        An urge lasts 15–20 minutes. This will pass.
      </div>
      {reasons.length > 0 && (
        <div className="mt-4 w-full max-w-sm rounded-2xl border p-4 text-left" style={{ borderColor: "var(--green-soft-border)", background: "var(--green-soft)" }}>
          <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--green-deep)" }}>
            You wrote this for exactly this moment:
          </div>
          {reasons.slice(0, 3).map((r) => (
            <p key={r.id} className="mt-1.5 text-[14px] font-bold leading-snug" style={{ color: "var(--ink)" }}>
              “{r.text}”
            </p>
          ))}
        </div>
      )}
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
          ref={primaryRef}
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
