import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.join(__dirname, '../data');
export const screenshotsDir = path.join(dataDir, 'screenshots');

fs.mkdirSync(screenshotsDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'heatmap.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    type    TEXT NOT NULL,
    x       REAL,
    y       REAL,
    path    TEXT NOT NULL,
    session TEXT NOT NULL,
    ts      INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_path ON events(path);
  CREATE INDEX IF NOT EXISTS idx_ts ON events(ts);
  CREATE INDEX IF NOT EXISTS idx_type ON events(type);

  CREATE TABLE IF NOT EXISTS screenshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    path            TEXT NOT NULL,
    device_type     TEXT NOT NULL,
    viewport_width  INTEGER,
    viewport_height INTEGER,
    filename        TEXT NOT NULL,
    ts              INTEGER NOT NULL,
    UNIQUE(path, device_type)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    session_id       TEXT PRIMARY KEY,
    visitor_id       TEXT,
    landing_path     TEXT NOT NULL,
    started_at       INTEGER NOT NULL,
    ended_at         INTEGER NOT NULL,
    last_activity_at INTEGER NOT NULL,
    pageview_count   INTEGER NOT NULL DEFAULT 0,
    click_count      INTEGER NOT NULL DEFAULT 0,
    scroll_count     INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(visitor_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);

  CREATE TABLE IF NOT EXISTS experiments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    path            TEXT NOT NULL,
    variants        TEXT NOT NULL,
    split_json      TEXT NOT NULL,
    goal_selector   TEXT,
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_experiments_path ON experiments(path);
  CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);

  CREATE TABLE IF NOT EXISTS assignments (
    visitor_id      TEXT NOT NULL,
    experiment_id   INTEGER NOT NULL,
    variant         TEXT NOT NULL,
    assigned_at     INTEGER NOT NULL,
    PRIMARY KEY (visitor_id, experiment_id),
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
  );
`);

function migrateEventsTable() {
  const cols = new Set(
    db.prepare('PRAGMA table_info(events)').all().map((c) => c.name)
  );
  const additions = [
    ['viewport_width', 'INTEGER'],
    ['viewport_height', 'INTEGER'],
    ['screen_width', 'INTEGER'],
    ['device_pixel_ratio', 'REAL'],
    ['device_type', 'TEXT'],
    ['selector', 'TEXT'],
    ['tag_name', 'TEXT'],
    ['element_text', 'TEXT'],
    ['visitor_id', 'TEXT'],
    ['experiment_id', 'INTEGER'],
    ['variant', 'TEXT'],
  ];
  for (const [name, type] of additions) {
    if (!cols.has(name)) {
      db.exec(`ALTER TABLE events ADD COLUMN ${name} ${type}`);
    }
  }
}

function migrateScreenshotsTable() {
  const cols = new Set(
    db.prepare('PRAGMA table_info(screenshots)').all().map((c) => c.name)
  );
  if (!cols.has('page_width')) {
    db.exec('ALTER TABLE screenshots ADD COLUMN page_width INTEGER');
  }
  if (!cols.has('page_height')) {
    db.exec('ALTER TABLE screenshots ADD COLUMN page_height INTEGER');
  }
}

migrateEventsTable();
migrateScreenshotsTable();
db.exec(`CREATE INDEX IF NOT EXISTS idx_device_type ON events(device_type)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_session ON events(session)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_visitor ON events(visitor_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_experiment ON events(experiment_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_variant ON events(variant)`);

function seedDemoExperiment() {
  const existing = db
    .prepare(`SELECT id FROM experiments WHERE path = '/demo/' AND status = 'active' LIMIT 1`)
    .get();
  if (existing) return;

  db.prepare(
    `INSERT INTO experiments (name, path, variants, split_json, goal_selector, status, created_at)
     VALUES (@name, @path, @variants, @splitJson, @goalSelector, 'active', @createdAt)`
  ).run({
    name: '로그인 버튼 색상 (데모)',
    path: '/demo/',
    variants: JSON.stringify(['A', 'B']),
    splitJson: JSON.stringify({ A: 50, B: 50 }),
    goalSelector: '#btn-login',
    createdAt: Date.now(),
  });
}

seedDemoExperiment();

export default db;
