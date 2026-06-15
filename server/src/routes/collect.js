import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import db, { screenshotsDir } from '../db.js';
import { screenshotFilename } from '../utils.js';
import { broadcastClick } from '../live.js';

const router = Router();

const insertStmt = db.prepare(
  `INSERT INTO events (
     type, x, y, path, session, ts,
     viewport_width, viewport_height, screen_width, device_pixel_ratio, device_type,
     selector, tag_name, element_text
   ) VALUES (
     @type, @x, @y, @path, @session, @ts,
     @viewportWidth, @viewportHeight, @screenWidth, @devicePixelRatio, @deviceType,
     @selector, @tagName, @elementText
   )`
);

const upsertScreenshotStmt = db.prepare(
  `INSERT INTO screenshots (path, device_type, viewport_width, viewport_height, page_width, page_height, filename, ts)
   VALUES (@path, @deviceType, @viewportWidth, @viewportHeight, @pageWidth, @pageHeight, @filename, @ts)
   ON CONFLICT(path, device_type) DO UPDATE SET
     viewport_width = excluded.viewport_width,
     viewport_height = excluded.viewport_height,
     page_width = excluded.page_width,
     page_height = excluded.page_height,
     filename = excluded.filename,
     ts = excluded.ts`
);

function insertMany(rows) {
  db.exec('BEGIN');
  try {
    for (const e of rows) insertStmt.run(e);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function normalizeEvent(e) {
  return {
    type: e.type,
    x: typeof e.x === 'number' ? e.x : null,
    y: typeof e.y === 'number' ? e.y : null,
    path: e.path,
    session: e.session,
    ts: e.ts,
    viewportWidth: typeof e.viewportWidth === 'number' ? e.viewportWidth : null,
    viewportHeight: typeof e.viewportHeight === 'number' ? e.viewportHeight : null,
    screenWidth: typeof e.screenWidth === 'number' ? e.screenWidth : null,
    devicePixelRatio: typeof e.devicePixelRatio === 'number' ? e.devicePixelRatio : null,
    deviceType: typeof e.deviceType === 'string' ? e.deviceType : null,
    selector: typeof e.selector === 'string' ? e.selector.slice(0, 500) : null,
    tagName: typeof e.tagName === 'string' ? e.tagName.slice(0, 50) : null,
    elementText: typeof e.elementText === 'string' ? e.elementText.slice(0, 200) : null,
  };
}

router.post('/heatmap', (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];

  const rows = events
    .filter((e) => e && e.type && e.path && e.session && e.ts)
    .map(normalizeEvent);

  if (rows.length) {
    insertMany(rows);
    for (const row of rows) {
      if (row.type === 'click') broadcastClick(row);
    }
  }

  res.sendStatus(204);
});

router.post('/screenshot', (req, res) => {
  const {
    path: pagePath,
    viewportWidth,
    viewportHeight,
    pageWidth,
    pageHeight,
    deviceType,
    image,
  } = req.body;

  if (!pagePath || !deviceType || !image) {
    return res.status(400).json({ error: 'path, deviceType, image are required' });
  }

  const match = image.match(/^data:image\/\w+;base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'invalid image data' });

  const filename = screenshotFilename(pagePath, deviceType);
  const filepath = path.join(screenshotsDir, filename);
  fs.writeFileSync(filepath, Buffer.from(match[1], 'base64'));

  upsertScreenshotStmt.run({
    path: pagePath,
    deviceType,
    viewportWidth: viewportWidth ?? null,
    viewportHeight: viewportHeight ?? null,
    pageWidth: pageWidth ?? null,
    pageHeight: pageHeight ?? null,
    filename,
    ts: Date.now(),
  });

  res.sendStatus(204);
});

export default router;
