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

export default db;
