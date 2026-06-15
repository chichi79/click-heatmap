import { Router } from 'express';
import db from '../db.js';

const router = Router();

function timeFilter(from, to) {
  const clauses = [];
  const params = {};
  if (from) {
    clauses.push('ts >= @from');
    params.from = Number(from);
  }
  if (to) {
    clauses.push('ts <= @to');
    params.to = Number(to);
  }
  return { clauses, params };
}

function deviceFilter(deviceType, clauses, params) {
  if (deviceType && deviceType !== 'all') {
    clauses.push('device_type = @deviceType');
    params.deviceType = deviceType;
  }
}

router.get('/paths', (req, res) => {
  const rows = db
    .prepare(
      `SELECT path, COUNT(*) as count
       FROM events
       GROUP BY path
       ORDER BY count DESC`
    )
    .all();
  res.json(rows);
});

router.get('/heatmap-data', (req, res) => {
  const { path, from, to, type = 'click', deviceType = 'all' } = req.query;
  if (!path) return res.status(400).json({ error: 'path is required' });

  const { clauses, params } = timeFilter(from, to);
  deviceFilter(deviceType, clauses, params);
  clauses.push('path = @path', 'type = @type', 'x IS NOT NULL', 'y IS NOT NULL');
  params.path = path;
  params.type = type;

  const rows = db
    .prepare(`SELECT x, y FROM events WHERE ${clauses.join(' AND ')} LIMIT 20000`)
    .all(params);

  res.json(rows);
});

router.get('/scroll-depth', (req, res) => {
  const { path, from, to, deviceType = 'all' } = req.query;
  if (!path) return res.status(400).json({ error: 'path is required' });

  const { clauses, params } = timeFilter(from, to);
  deviceFilter(deviceType, clauses, params);
  clauses.push('path = @path', "type = 'scroll'");
  params.path = path;

  const sessions = db
    .prepare(
      `SELECT session, MAX(y) as maxY
       FROM events WHERE ${clauses.join(' AND ')}
       GROUP BY session`
    )
    .all(params);

  const total = sessions.length;
  const thresholds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const data = thresholds.map((depth) => {
    const reached = sessions.filter((s) => s.maxY >= depth).length;
    return {
      depth,
      sessions: reached,
      pct: total ? +((reached / total) * 100).toFixed(1) : 0,
    };
  });

  res.json({ total, data });
});

router.get('/element-clicks', (req, res) => {
  const { path, from, to, deviceType = 'all' } = req.query;
  if (!path) return res.status(400).json({ error: 'path is required' });

  const { clauses, params } = timeFilter(from, to);
  deviceFilter(deviceType, clauses, params);
  clauses.push('path = @path', "type = 'click'", 'selector IS NOT NULL');
  params.path = path;

  const rows = db
    .prepare(
      `SELECT selector, tag_name as tagName,
              MAX(element_text) as elementText,
              COUNT(*) as count
       FROM events
       WHERE ${clauses.join(' AND ')}
       GROUP BY selector, tag_name
       ORDER BY count DESC
       LIMIT 20`
    )
    .all(params);

  res.json(rows);
});

router.get('/screenshot', (req, res) => {
  const { path, deviceType = 'desktop' } = req.query;
  if (!path) return res.status(400).json({ error: 'path is required' });

  const row = db
    .prepare(
      `SELECT filename,
              viewport_width as viewportWidth,
              viewport_height as viewportHeight,
              page_width as pageWidth,
              page_height as pageHeight,
              ts
       FROM screenshots
       WHERE path = @path AND device_type = @deviceType`
    )
    .get({ path, deviceType });

  if (!row) return res.status(404).json({ error: 'screenshot not found' });

  res.json({
    url: `/screenshots/${row.filename}?t=${row.ts}`,
    viewportWidth: row.viewportWidth,
    viewportHeight: row.viewportHeight,
    pageWidth: row.pageWidth,
    pageHeight: row.pageHeight,
  });
});

router.get('/live-recent', (req, res) => {
  const { path, minutes = '5', deviceType = 'all' } = req.query;
  if (!path) return res.status(400).json({ error: 'path is required' });

  const from = Date.now() - Number(minutes) * 60 * 1000;
  const clauses = ['path = @path', "type = 'click'", 'ts >= @from', 'x IS NOT NULL', 'y IS NOT NULL'];
  const params = { path, from };
  deviceFilter(deviceType, clauses, params);

  const rows = db
    .prepare(
      `SELECT x, y, selector, tag_name as tagName, element_text as elementText,
              device_type as deviceType, ts, session
       FROM events
       WHERE ${clauses.join(' AND ')}
       ORDER BY ts DESC
       LIMIT 1000`
    )
    .all(params);

  res.json(rows);
});

router.get('/path-plot', (req, res) => {
  const { path, from, to, deviceType = 'all', limit = '10' } = req.query;
  if (!path) return res.status(400).json({ error: 'path is required' });

  const { clauses, params } = timeFilter(from, to);
  deviceFilter(deviceType, clauses, params);
  clauses.push('path = @path', "type = 'click'", 'selector IS NOT NULL');
  params.path = path;

  const clicks = db
    .prepare(
      `SELECT session, selector, tag_name as tagName, element_text as elementText, ts, x, y
       FROM events
       WHERE ${clauses.join(' AND ')}
       ORDER BY session, ts ASC
       LIMIT 50000`
    )
    .all(params);

  function stepLabel(c) {
    const text = (c.elementText || '').replace(/\s+/g, ' ').trim();
    if (text) return text.slice(0, 28);
    if (c.tagName) return `<${c.tagName}>`;
    return (c.selector || '?').slice(0, 28);
  }

  const bySession = new Map();
  for (const c of clicks) {
    if (!bySession.has(c.session)) bySession.set(c.session, []);
    bySession.get(c.session).push(c);
  }

  const pathCounts = new Map();
  const sessionSamples = [];

  for (const [session, sessionClicks] of bySession) {
    const sequence = [];
    let prevKey = null;

    for (const click of sessionClicks) {
      const key = click.selector || stepLabel(click);
      if (key === prevKey) continue;
      sequence.push({
        label: stepLabel(click),
        tagName: click.tagName,
        selector: click.selector,
        x: click.x,
        y: click.y,
      });
      prevKey = key;
      if (sequence.length >= 8) break;
    }

    if (sequence.length < 2) continue;

    sessionSamples.push({
      session,
      steps: sequence,
      startedAt: sessionClicks[0].ts,
      clickCount: sessionClicks.length,
    });

    const pathKey = sequence.map((s) => s.selector || s.label).join('\0');
    const existing = pathCounts.get(pathKey);
    if (existing) {
      existing.count += 1;
    } else {
      pathCounts.set(pathKey, { count: 1, steps: sequence });
    }
  }

  const totalSessions = sessionSamples.length;
  const maxPaths = Math.min(Number(limit) || 10, 20);

  const paths = [...pathCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxPaths)
    .map((p, i) => ({
      rank: i + 1,
      count: p.count,
      pct: totalSessions ? +((p.count / totalSessions) * 100).toFixed(1) : 0,
      steps: p.steps,
    }));

  sessionSamples.sort((a, b) => b.startedAt - a.startedAt);

  res.json({
    totalSessions,
    totalClicks: clicks.length,
    paths,
    sessions: sessionSamples.slice(0, 12),
  });
});

router.get('/timeline', (req, res) => {
  const { path, type = 'click', interval = 'day' } = req.query;
  if (!path) return res.status(400).json({ error: 'path is required' });

  const format = interval === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d';
  const rows = db
    .prepare(
      `SELECT strftime('${format}', ts / 1000, 'unixepoch') as bucket, COUNT(*) as count
       FROM events
       WHERE path = @path AND type = @type
       GROUP BY bucket
       ORDER BY bucket`
    )
    .all({ path, type });

  res.json(rows);
});

export default router;
