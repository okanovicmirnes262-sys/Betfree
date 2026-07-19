"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ---------------- tipovi i podaci ---------------- */

type Profile = {
  weeklySpend: number;
  riskScore: number;
  quizDone: boolean;
  quitStart: string | null;
  urges: number;
};

type Me = { user: { id: number; name: string; email: string }; profile: Profile };

type Option = [string, number] | [string, number, number];

const QUESTIONS: { t: string; s: string; o: Option[] }[] = [
  { t: "Koliko dugo se kladiš?", s: "Bilo što — sport, casino, aparati, live klađenje.", o: [["Manje od godinu dana", 0], ["1–3 godine", 1], ["3–7 godina", 2], ["Više od 7 godina", 3]] },
  { t: "Koliko često se kladiš?", s: "Budi iskren — nitko ovo ne vidi osim tebe.", o: [["Par puta mjesečno", 0], ["Svaki vikend", 1], ["Skoro svaki dan", 2], ["Više puta dnevno", 3]] },
  { t: "Koliko u prosjeku potrošiš na klađenje tjedno?", s: "Ukupne uplate, ne samo 'neto gubitak'.", o: [["Do 15 €", 0, 10], ["15–50 €", 1, 30], ["50–150 €", 2, 90], ["Preko 150 €", 3, 220]] },
  { t: "Kad izgubiš, koliko često 'loviš' izgubljeno novim okladama?", s: "Chasing losses je najjači znak problema.", o: [["Nikad", 0], ["Ponekad", 1], ["Često", 2], ["Skoro uvijek", 3]] },
  { t: "Jesi li ikad lagao bližnjima o tome koliko se kladiš?", s: "", o: [["Ne, svi znaju", 0], ["Umanjio sam iznose", 1], ["Da, skrivam to", 2], ["Nitko nema pojma koliko", 3]] },
  { t: "Klađenje tijekom utakmice (live) — koliko često?", s: "Live klađenje je dizajnirano da bude najteže kontrolirati.", o: [["Ne kladim se live", 0], ["Rijetko", 1], ["Redovito", 2], ["Bez live oklade ne mogu gledati tekmu", 3]] },
  { t: "Jesi li se ikad zadužio zbog klađenja?", s: "Minus, posudba od prijatelja, kredit, kartice...", o: [["Nikad", 0], ["Jednom-dvaput minus", 1], ["Da, posudio sam novac", 2], ["Da, imam dug koji vraćam", 3]] },
  { t: "Jesi li već pokušao prestati?", s: "", o: [["Nisam nikad probao", 1], ["Jednom, izdržao neko vrijeme", 1], ["Više puta, uvijek se vratim", 2], ["Stalno pokušavam i ne ide", 3]] },
  { t: "Što ti je najčešći okidač?", s: "Ovo koristimo za tvoj plan.", o: [["Sport na TV-u i ekipa", 1], ["Reklame i ponude kladionica", 1], ["Dosada i stres", 1], ["Osjećaj da 'moram vratiti' izgubljeno", 2]] },
  { t: "Kako se osjećaš nakon dana klađenja?", s: "Zadnje pitanje.", o: [["Normalno, zabava je", 0], ["Malo krivnje ponekad", 1], ["Često se osjećam loše", 2], ["Prazno, ljuto i s kajanjem", 3]] },
];

const TRIGGERS = [
  "Gledam utakmicu / sport na TV-u",
  "Reklama ili ponuda kladionice",
  "Sjela mi je plaća / imam novca",
  "Ekipa se kladi / pričaju o listićima",
  "Dosada ili stres",
];

function fmtEur(n: number) {
  return n.toLocaleString("hr-HR", { maximumFractionDigits: 0 }) + " €";
}

/* ---------------- male komponente ---------------- */

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={"rounded-3xl border bg-white/85 backdrop-blur " + className}
      style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-card)", ...style }}
    >
      {children}
    </div>
  );
}

function Brand() {
  return (
    <div className="text-[15px] font-extrabold tracking-tight">
      Bet<span style={{ color: "var(--green)" }}>Free</span>
    </div>
  );
}

/* ---------------- glavna stranica ---------------- */

type Screen = "loading" | "welcome" | "quiz" | "result" | "dash";

export default function AppPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [screen, setScreen] = useState<Screen>("loading");

  // quiz
  const [qIndex, setQIndex] = useState(0);
  const [risk, setRisk] = useState(0);
  const [spend, setSpend] = useState(30);

  // dashboard
  const [now, setNow] = useState(() => Date.now());
  const [urges, setUrges] = useState(0);
  const [panic, setPanic] = useState(false);
  const [sheet, setSheet] = useState<"" | "excl" | "log" | "help">("");
  const [logged, setLogged] = useState(false);
  const [animLoss, setAnimLoss] = useState(0);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((data: Me | null) => {
        if (!data) return;
        setMe(data);
        setUrges(data.profile?.urges ?? 0);
        setSpend(data.profile?.weeklySpend ?? 30);
        setRisk(data.profile?.riskScore ?? 0);
        setScreen(data.profile?.quizDone ? "dash" : "welcome");
      })
      .catch(() => setScreen("welcome"));
  }, [router]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // animirani count-up gubitka na ekranu rezultata
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
    const r = await fetch("/api/me").then((r) => r.json()).catch(() => null);
    if (r) setMe(r);
    setScreen("dash");
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
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  /* ---------------- ekrani ---------------- */

  if (screen === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="animate-rise text-[15px] font-bold" style={{ color: "var(--muted)" }}>
          Učitavam tvoj napredak…
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-7">
      {/* WELCOME */}
      {screen === "welcome" && (
        <section className="animate-rise flex flex-1 flex-col">
          <div className="flex items-center justify-between">
            <Brand />
            <button onClick={logout} className="text-[13px] font-bold" style={{ color: "var(--muted)" }}>
              Odjava
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <div className="mono mb-3 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--green)" }}>
              Test od 10 pitanja · 2 minute
            </div>
            <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-tight">
              {me ? `${me.user.name}, koliko` : "Koliko"} te klađenje stvarno košta?
            </h1>
            <p className="mt-3 text-[15.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
              Odgovori iskreno na 10 pitanja. Izračunat ćemo koliko gubiš, procijeniti rizik i složiti tvoj plan prestanka. Sve ostaje privatno na tvom računu.
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
            Kreni na test
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
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(qIndex / 10) * 100}%`, background: "var(--amber)" }}
              />
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
                className="w-full rounded-2xl border bg-white px-4 py-3.5 text-left text-[15px] font-semibold transition hover:shadow-md active:scale-[0.985]"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
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
          <Brand />
          <div className="mt-6">
            <span
              className="mono inline-block rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.1em]"
              style={
                risk >= 16
                  ? { background: "#fdf0ec", borderColor: "#f3cfc2", color: "var(--ember-deep)" }
                  : risk >= 9
                    ? { background: "#faf3e3", borderColor: "#ecd9ae", color: "#9a7420" }
                    : { background: "var(--green-soft)", borderColor: "#c4ddcf", color: "var(--green-deep)" }
              }
            >
              {risk >= 16 ? "VISOK RIZIK" : risk >= 9 ? "POVIŠEN RIZIK" : "NIŽI RIZIK"}
            </span>
            <div className="mono mt-4 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--green)" }}>
              Tvoja projekcija
            </div>
            <div className="mono mt-1 text-[50px] font-semibold leading-none tracking-tight" style={{ color: "var(--ember-deep)" }}>
              {fmtEur(animLoss)}
            </div>
            <div className="mt-1.5 text-[14px]" style={{ color: "var(--muted)" }}>
              procijenjeni gubitak u sljedećih 5 godina ako nastaviš ovim tempom
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ...(fiveYr >= 20000 ? ["🚗 rabljeni auto"] : fiveYr >= 8000 ? ["🚗 solidan polog za auto"] : []),
                ...(fiveYr >= 5000 ? [`✈️ ${Math.max(1, Math.floor(fiveYr / 1500))} putovanja`] : []),
                `📱 ${Math.max(1, Math.floor(fiveYr / 1000))}× novi mobitel`,
              ].map((c) => (
                <span key={c} className="rounded-full border bg-white px-3.5 py-2 text-[13px] font-semibold" style={{ borderColor: "var(--line)" }}>
                  {c}
                </span>
              ))}
            </div>

            <Card className="mt-4 p-5">
              <h3 className="text-[15px] font-extrabold">
                {risk >= 16
                  ? "Tvoji odgovori pokazuju obrazac ozbiljnog problema"
                  : risk >= 9
                    ? "Klađenje ti polako uzima kontrolu"
                    : "Još uvijek imaš kontrolu — zadrži je"}
              </h3>
              <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
                {risk >= 16
                  ? "Lovljenje gubitaka, skrivanje i osjećaj kajanja su znakovi koje stručnjaci povezuju s problematičnim kockanjem. Aplikacija ti može pomoći kod dnevne discipline, ali kod ovakvog rezultata najjači potez je i razgovor sa stručnjakom — popis resursa imaš unutra."
                  : risk >= 9
                    ? "Nisi u najgoroj fazi, ali obrasci poput lovljenja gubitaka i redovitog klađenja pokazuju da navika jača. Sad je najlakše stati — svaki mjesec čekanja podiže cijenu."
                    : "Tvoji odgovori ne pokazuju tešku ovisnost, ali novac svejedno curi. Prestanak sada znači da nikad nećeš saznati kako izgleda ona gora faza."}
              </p>
            </Card>

            <Card className="mt-3 p-5">
              <h3 className="text-[15px] font-extrabold">Tvoj plan</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
                Dan 1: samoisključenje iz svih kladionica (vodič u aplikaciji). Tjedan 1: bloker + uklanjanje kartica. Svaki dan: brojač ti pokazuje koliko si ušteđivao, a panic button te vodi kroz porive. Prvih 30 dana je najteže — poslije toga mozak se počinje resetirati.
              </p>
            </Card>
          </div>
          <div className="mt-auto pt-6">
            <button
              onClick={enterDash}
              className="w-full rounded-2xl py-4 text-[16px] font-extrabold text-white transition active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, var(--green), var(--green-deep))", boxShadow: "0 8px 24px rgba(47,122,88,0.35)" }}
            >
              Počni svoj prvi dan bez klađenja
            </button>
          </div>
        </section>
      )}

      {/* DASHBOARD */}
      {screen === "dash" && (
        <section className="animate-rise flex flex-1 flex-col">
          <div className="flex items-center justify-between">
            <Brand />
            <div className="flex items-center gap-3">
              <div className="mono text-[12px] font-semibold" style={{ color: "var(--muted)" }}>
                {new Date(now).toLocaleDateString("hr-HR", { day: "numeric", month: "short", year: "numeric" })}
              </div>
              <button onClick={logout} className="text-[13px] font-bold" style={{ color: "var(--muted)" }}>
                Odjava
              </button>
            </div>
          </div>

          {(() => {
            const quitStart = me?.profile?.quitStart ? new Date(me.profile.quitStart).getTime() : now;
            const s = Math.max(0, Math.floor((now - quitStart) / 1000));
            const days = Math.floor(s / 86400);
            const h = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
            const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
            const sec = String(s % 60).padStart(2, "0");
            const saved = (spend / (7 * 24 * 3600)) * s;
            return (
              <>
                <div className="pt-8 pb-2 text-center">
                  <div className="mono text-[54px] font-semibold leading-none tracking-tight">
                    {days}d {h}:{m}:{sec}
                  </div>
                  <div className="mt-2 text-[14px] font-semibold" style={{ color: "var(--muted)" }}>
                    bez ijedne oklade{me ? ` — bravo, ${me.user.name}` : ""}
                  </div>
                </div>

                <div
                  className="mt-5 rounded-3xl p-6 text-center text-white"
                  style={{ background: "linear-gradient(135deg, var(--green-deep), var(--green))", boxShadow: "0 12px 32px rgba(31,90,64,0.35)" }}
                >
                  <div className="mono text-[38px] font-semibold leading-none">
                    {saved.toLocaleString("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </div>
                  <div className="mt-1.5 text-[13px] font-medium" style={{ color: "#cde9da" }}>
                    ušteđeno otkad si prestao · raste svake sekunde
                  </div>
                </div>
              </>
            );
          })()}

          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <div className="mono text-[20px] font-semibold">{urges}</div>
              <div className="mt-0.5 text-[12px] font-semibold" style={{ color: "var(--muted)" }}>
                poriva svladano
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="mono text-[20px] font-semibold">{fmtEur(spend * 52)}</div>
              <div className="mt-0.5 text-[12px] font-semibold" style={{ color: "var(--muted)" }}>
                ušteda u 1 godini
              </div>
            </Card>
          </div>

          <button
            onClick={() => setPanic(true)}
            className="mt-6 w-full rounded-3xl py-5 text-[18px] font-extrabold tracking-tight text-white transition active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, var(--ember), var(--ember-deep))", boxShadow: "0 12px 32px rgba(217,106,72,0.4)" }}
          >
            ⚡ IMAM PORIV — POMOZI MI
          </button>

          <div className="mt-4 space-y-2.5">
            {[
              ["excl", "Samoisključenje iz kladionica"],
              ["log", "Zapiši poriv u dnevnik"],
              ["help", "Trebam razgovor sa stručnjakom"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setLogged(false);
                  setSheet(id as "excl" | "log" | "help");
                }}
                className="flex w-full items-center justify-between rounded-2xl border bg-white px-4 py-3.5 text-[15px] font-semibold transition hover:shadow-md"
                style={{ borderColor: "var(--line)" }}
              >
                {label}
                <span style={{ color: "var(--muted)" }}>→</span>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-7 text-center text-[11.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
            BetFree nije zamjena za stručnu pomoć. Ako je kockanje ozbiljno utjecalo na tvoje financije ili odnose, javi se stručnjaku — u aplikaciji imaš popis resursa.
          </div>
        </section>
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
            className="animate-rise max-h-[80dvh] w-full max-w-md overflow-auto rounded-t-[28px] bg-white p-6 pb-9"
            style={{ boxShadow: "0 -12px 40px rgba(34,49,42,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {sheet === "excl" && (
              <>
                <h3 className="text-[19px] font-extrabold">Samoisključenje — korak po korak</h3>
                {[
                  "Napiši popis svih kladionica i casina gdje imaš račun (i online i poslovnice).",
                  "U svakoj aplikaciji otvori postavke računa → „Odgovorno igranje“ → zatraži samoisključenje na najduži mogući rok.",
                  "Provjeri postoji li u tvojoj državi nacionalni registar samoisključenja — jedan zahtjev pokriva sve licencirane priređivače.",
                  "Instaliraj bloker stranica za klađenje (npr. Gamban ili BetBlocker) na mobitel i računalo.",
                  "Ukloni spremljene kartice iz kladionica i po potrebi zatraži od banke blokadu uplata prema priređivačima igara na sreću.",
                ].map((step, i) => (
                  <div key={i} className="flex gap-3 border-b py-3 text-[14.5px] leading-relaxed" style={{ borderColor: "var(--line)" }}>
                    <span className="mono mt-0.5 flex-shrink-0 text-[13px] font-semibold" style={{ color: "var(--amber)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{ color: "var(--ink-soft)" }}>{step}</span>
                  </div>
                ))}
              </>
            )}

            {sheet === "log" && (
              <>
                <h3 className="text-[19px] font-extrabold">Što je pokrenulo poriv?</h3>
                <div className="mt-4 space-y-2.5">
                  {TRIGGERS.map((t) => (
                    <button
                      key={t}
                      onClick={() => logUrge(t)}
                      className="w-full rounded-2xl border bg-white px-4 py-3.5 text-left text-[15px] font-semibold transition hover:shadow-md"
                      style={{ borderColor: "var(--line)" }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {logged && (
                  <div
                    className="animate-rise mt-4 rounded-2xl border px-4 py-3 text-[14px] font-semibold"
                    style={{ background: "var(--green-soft)", borderColor: "#c4ddcf", color: "var(--green-deep)" }}
                  >
                    Zapisano. Svaki zabilježen poriv koji ne pretvoriš u okladu je pobjeda.
                  </div>
                )}
              </>
            )}

            {sheet === "help" && (
              <>
                <h3 className="text-[19px] font-extrabold">Stručna pomoć</h3>
                {[
                  ["Anonimni kockari", "besplatne grupe podrške; sastanci postoje u većini većih gradova i online."],
                  ["Savjetovališta za ovisnosti", "u Hrvatskoj djeluju pri domovima zdravlja i klinikama; razgovor je povjerljiv."],
                  ["Psihoterapeut specijaliziran za ovisnosti", "najučinkovitiji put ako klađenje traje godinama ili postoje dugovi."],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-3 border-b py-3 text-[14.5px] leading-relaxed" style={{ borderColor: "var(--line)" }}>
                    <span className="mono mt-0.5 flex-shrink-0" style={{ color: "var(--amber)" }}>→</span>
                    <span style={{ color: "var(--ink-soft)" }}>
                      <b style={{ color: "var(--ink)" }}>{title}</b> — {desc}
                    </span>
                  </div>
                ))}
                <p className="mt-4 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  Ako osjećaš da situacija ozbiljno utječe na tvoje mentalno zdravlje, nemoj čekati — javi se liječniku ili savjetovalištu što prije.
                </p>
              </>
            )}

            <button
              onClick={() => setSheet("")}
              className="mt-5 w-full rounded-2xl border bg-white py-3.5 text-[15px] font-bold transition hover:shadow-md"
              style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
            >
              Zatvori
            </button>
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center" style={{ background: "rgba(244,246,242,0.97)" }}>
      <div className="mono text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--green)" }}>
        Poriv traje 15–20 minuta. Ovo će proći.
      </div>
      <div className="mono mt-3 text-[32px] font-semibold">{t === 0 ? "0:00 ✓" : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`}</div>
      <div
        className="breathe my-8 flex h-40 w-40 items-center justify-center rounded-full text-[15px] font-bold"
        style={{
          background: "radial-gradient(circle, rgba(47,122,88,0.25), rgba(47,122,88,0.05))",
          border: "2px solid var(--green)",
          color: "var(--green-deep)",
        }}
      >
        diši
      </div>
      <p className="max-w-[290px] text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
        Udahni dok se krug širi, izdahni dok se skuplja. Ne moraš pobijediti klađenje zauvijek — samo sljedećih 60 sekundi.
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
          Izdržao sam ✓
        </button>
        <button
          onClick={() => onClose(false)}
          className="w-full rounded-2xl border bg-white py-3.5 text-[15px] font-bold"
          style={{ borderColor: "var(--line)", color: "var(--muted)" }}
        >
          Zatvori
        </button>
      </div>
    </div>
  );
}
