import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
export const screenshotsDir = path.join(dataDir, 'screenshots');

fs.mkdirSync(screenshotsDir, { recursive: true });

// Dev: file:./data/heatmap.db  |  Prod: libsql://xxx.turso.io
const rawPath = path.join(dataDir, 'heatmap.db').replace(/\\/g, '/');
const url = process.env.TURSO_URL || `file:${rawPath}`;
const authToken = process.env.TURSO_TOKEN || undefined;

export const db = createClient({ url, authToken });

// ── 동기 node:sqlite API와 유사한 async 헬퍼 ──────────────────
export async function all(sql, args = {}) {
  const r = await db.execute({ sql, args });
  return r.rows;
}
export async function get(sql, args = {}) {
  const r = await db.execute({ sql, args });
  return r.rows[0] ?? null;
}
export async function run(sql, args = {}) {
  return db.execute({ sql, args });
}
export async function batch(stmts) {
  return db.batch(stmts, 'write');
}

// ── 스키마 초기화 (top-level await — ESM only) ────────────────
await db.execute(`
  CREATE TABLE IF NOT EXISTS events (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    type               TEXT    NOT NULL,
    x                  REAL,
    y                  REAL,
    path               TEXT    NOT NULL,
    session            TEXT    NOT NULL,
    ts                 INTEGER NOT NULL,
    viewport_width     INTEGER,
    viewport_height    INTEGER,
    screen_width       INTEGER,
    device_pixel_ratio REAL,
    device_type        TEXT,
    selector           TEXT,
    tag_name           TEXT,
    element_text       TEXT,
    visitor_id         TEXT,
    experiment_id      INTEGER,
    variant            TEXT
  )
`);

await db.execute(`CREATE TABLE IF NOT EXISTS screenshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  path            TEXT    NOT NULL,
  device_type     TEXT    NOT NULL,
  viewport_width  INTEGER,
  viewport_height INTEGER,
  page_width      INTEGER,
  page_height     INTEGER,
  filename        TEXT    NOT NULL,
  ts              INTEGER NOT NULL,
  UNIQUE(path, device_type)
)`);

await db.execute(`CREATE TABLE IF NOT EXISTS sessions (
  session_id       TEXT PRIMARY KEY,
  visitor_id       TEXT,
  landing_path     TEXT    NOT NULL,
  started_at       INTEGER NOT NULL,
  ended_at         INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  pageview_count   INTEGER NOT NULL DEFAULT 0,
  click_count      INTEGER NOT NULL DEFAULT 0,
  scroll_count     INTEGER NOT NULL DEFAULT 0
)`);

await db.execute(`CREATE TABLE IF NOT EXISTS experiments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  path          TEXT    NOT NULL,
  variants      TEXT    NOT NULL,
  split_json    TEXT    NOT NULL,
  goal_selector TEXT,
  status        TEXT    NOT NULL DEFAULT 'active',
  created_at    INTEGER NOT NULL
)`);

await db.execute(`CREATE TABLE IF NOT EXISTS assignments (
  visitor_id    TEXT    NOT NULL,
  experiment_id INTEGER NOT NULL,
  variant       TEXT    NOT NULL,
  assigned_at   INTEGER NOT NULL,
  PRIMARY KEY (visitor_id, experiment_id)
)`);

// 인덱스
const indexes = [
  `CREATE INDEX IF NOT EXISTS idx_path        ON events(path)`,
  `CREATE INDEX IF NOT EXISTS idx_ts          ON events(ts)`,
  `CREATE INDEX IF NOT EXISTS idx_type        ON events(type)`,
  `CREATE INDEX IF NOT EXISTS idx_device_type ON events(device_type)`,
  `CREATE INDEX IF NOT EXISTS idx_session     ON events(session)`,
  `CREATE INDEX IF NOT EXISTS idx_visitor     ON events(visitor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_experiment  ON events(experiment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_variant     ON events(variant)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(visitor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at)`,
  `CREATE INDEX IF NOT EXISTS idx_experiments_path   ON experiments(path)`,
  `CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status)`,
];
for (const sql of indexes) await db.execute(sql);

// 데모 실험 시드
const demoExists = await get(
  `SELECT id FROM experiments WHERE path = '/demo/' AND status = 'active' LIMIT 1`
);
if (!demoExists) {
  await run(
    `INSERT INTO experiments (name, path, variants, split_json, goal_selector, status, created_at)
     VALUES (:name, :path, :variants, :splitJson, :goalSelector, 'active', :createdAt)`,
    {
      name: '로그인 버튼 색상 (데모)',
      path: '/demo/',
      variants: JSON.stringify(['A', 'B']),
      splitJson: JSON.stringify({ A: 50, B: 50 }),
      goalSelector: '#btn-login',
      createdAt: Date.now(),
    }
  );
}

export default db;
