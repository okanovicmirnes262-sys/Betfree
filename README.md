# BetFree — Quit gambling for good

A web app that helps people stop betting: a 10-question risk test, loss projection, live day counter and money-saved ticker, daily motivational messages, milestone badges, a savings goal, a panic button for urges, an urge journal with history & patterns, and a self-exclusion guide.

## Tech stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** — light calming design with automatic dark mode + manual toggle
- **libSQL / SQLite** — users and progress storage (local file, [Turso](https://turso.tech) cloud ready)
- **bcryptjs + jose** — secure auth (password hashing + JWT session in an httpOnly cookie, 365-day persistent session)

## Getting started

```bash
npm install
npm run dev
```

The app runs at http://localhost:3000. The database is created automatically at `data/betfree.db`.

## Environment variables (production)

| Variable | Description |
|---|---|
| `SESSION_SECRET` | Secret key for signing sessions — required in production |
| `TURSO_DATABASE_URL` | (optional) Turso database URL instead of the local file |
| `TURSO_AUTH_TOKEN` | (optional) Turso auth token |

## Structure

- `/login` — sign in & sign up (email + password; Google/Apple buttons prepared)
- `/app` — protected app: quiz → result → dashboard (streak, savings, daily motivation, milestones, savings goal, panic button, urge journal & history, self-exclusion, professional help, compassionate relapse reset)
- `/api/auth/*` — register, login, logout
- `/api/me`, `/api/profile`, `/api/urges` — per-account user data and progress (currency, goal, relapses, urge history)

> BetFree is not a substitute for professional help with problem gambling.
