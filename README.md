# BetFree — Prestani se kladiti

Web aplikacija koja pomaže korisnicima da prestanu s klađenjem: test rizika od 10 pitanja, projekcija gubitka, brojač dana i ušteđenog novca uživo, panic button za trenutke poriva, dnevnik poriva i vodič za samoisključenje.

## Tehnologije

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** — svijetli, smirujući dizajn
- **libSQL / SQLite** — baza korisnika i napretka (lokalna datoteka, spremna za [Turso](https://turso.tech) cloud)
- **bcryptjs + jose** — sigurna prijava (hash lozinki + JWT sesija u httpOnly cookieju, traje 365 dana)

## Pokretanje

```bash
npm install
npm run dev
```

Aplikacija je na http://localhost:3000. Baza se automatski kreira u `data/betfree.db`.

## Varijable okruženja (produkcija)

| Varijabla | Opis |
|---|---|
| `SESSION_SECRET` | Tajni ključ za potpisivanje sesija — obavezno postaviti u produkciji |
| `TURSO_DATABASE_URL` | (opcionalno) URL Turso baze umjesto lokalne datoteke |
| `TURSO_AUTH_TOKEN` | (opcionalno) Turso token |

## Struktura

- `/login` — prijava i registracija (email + lozinka, social gumbi pripremljeni)
- `/app` — zaštićena aplikacija: quiz → rezultat → dashboard (streak, ušteda, panic button, dnevnik poriva, samoisključenje, stručna pomoć)
- `/api/auth/*` — registracija, prijava, odjava
- `/api/me`, `/api/profile`, `/api/urges` — korisnički podaci i napredak vezani uz račun

> BetFree nije zamjena za stručnu pomoć kod problematičnog kockanja.
