import { createClient, type Client, type InStatement } from "@libsql/client";
import fs from "fs";
import path from "path";

type GlobalWithDb = typeof globalThis & {
  __betfreeDbPromise?: Promise<Client>;
};

const DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY,
    weekly_spend REAL NOT NULL DEFAULT 30,
    risk_score INTEGER NOT NULL DEFAULT 0,
    quiz_done INTEGER NOT NULL DEFAULT 0,
    quit_start TEXT,
    urges INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'EUR',
    goal_name TEXT NOT NULL DEFAULT '',
    goal_amount REAL NOT NULL DEFAULT 0,
    relapses INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS urge_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    trigger TEXT NOT NULL DEFAULT '',
    won INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS user_reasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS user_checkins (
    user_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    mood INTEGER NOT NULL,
    had_urge INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, day)
  );
  CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nickname TEXT NOT NULL,
    streak_days INTEGER NOT NULL DEFAULT 0,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS post_reactions (
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    PRIMARY KEY (post_id, user_id, kind)
  );
  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    reset_at INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS email_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
  );
`;

async function initDb(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL;
  let client: Client;
  if (url) {
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  } else {
    const dir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    client = createClient({ url: "file:" + path.join(dir, "betfree.db") });
  }
  for (const stmt of DDL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
  }
  // migrations for databases created before these columns existed
  const MIGRATIONS = [
    "ALTER TABLE profiles ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR'",
    "ALTER TABLE profiles ADD COLUMN goal_name TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE profiles ADD COLUMN goal_amount REAL NOT NULL DEFAULT 0",
    "ALTER TABLE profiles ADD COLUMN relapses INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN first_name TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN last_name TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE profiles ADD COLUMN debt_amount REAL NOT NULL DEFAULT 0",
    "ALTER TABLE profiles ADD COLUMN danger_hours TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0",
  ];
  for (const m of MIGRATIONS) {
    try {
      await client.execute(m);
    } catch {
      // column already exists
    }
  }
  return client;
}

export function getDb(): Promise<Client> {
  const g = globalThis as GlobalWithDb;
  if (!g.__betfreeDbPromise) g.__betfreeDbPromise = initDb();
  return g.__betfreeDbPromise;
}

export async function query(stmt: InStatement) {
  const db = await getDb();
  return db.execute(stmt);
}

/** Runs statements atomically in a single write transaction. */
export async function batch(stmts: InStatement[]) {
  const db = await getDb();
  return db.batch(stmts, "write");
}
