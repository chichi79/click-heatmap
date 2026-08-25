import { Router } from 'express';
import { all, get } from '../db.js';

const router = Router();

function timeFilter(from, to) {
  const clauses = [], params = {};
  if (from) { clauses.push('ts >= :from'); params.from = Number(from); }
  if (to)   { clauses.push('ts <= :to');   params.to   = Number(to);   }
  return { clauses, params };
}

function deviceFilter(deviceType, clauses, params) {
  if (deviceType && deviceType !== 'all') {
    clauses.push('device_type = :deviceType');
    params.deviceType = deviceType;
  }
}

function variantFilter(variant, clauses, params) {
  if (variant && variant !== 'all') {
    clauses.push('variant = :variant');
    params.variant = variant;
  }
}

function pageGroupFilter(pageGroup, clauses, params) {
  if (pageGroup && pageGroup !== 'all') {
    clauses.push('page_group = :pageGroup');
    params.pageGroup = pageGroup;
  }
}

router.get('/paths', async (req, res) => {
  try {
    const { from, to, deviceType = 'all' } = req.query;
    const { clauses, params } = timeFilter(from, to);
    deviceFilter(deviceType, clauses, params);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const rows = await all(
      `SELECT path,
              MAX(page_group) as pageGroup,
              SUM(CASE WHEN type = 'click'    THEN 1 ELSE 0 END) as clicks,
              SUM(CASE WHEN type = 'scroll'   THEN 1 ELSE 0 END) as scrolls,
              SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END) as pageviews,
              COUNT(DISTINCT session)    as sessions,
              COUNT(DISTINCT visitor_id) as uv
       FROM events ${where}
       GROUP BY path ORDER BY clicks DESC`,
      params
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

// pageGroup 목록
router.get('/page-groups', async (req, res) => {
  try {
    const rows = await all(
      `SELECT page_group as pageGroup,
              COUNT(DISTINCT path) as pathCount,
              SUM(CASE WHEN type='click' THEN 1 ELSE 0 END) as clicks,
              SUM(CASE WHEN type='pageview' THEN 1 ELSE 0 END) as pageviews,
              COUNT(DISTINCT visitor_id) as uv
       FROM events WHERE page_group IS NOT NULL
       GROUP BY page_group ORDER BY clicks DESC`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

// 존 랭킹 (pageGroup 또는 path 기준)
router.get('/zone-clicks', async (req, res) => {
  try {
    const { path, pageGroup, from, to, deviceType = 'all' } = req.query;
    if (!path && !pageGroup) return res.status(400).json({ error: 'path or pageGroup is required' });

    const { clauses, params } = timeFilter(from, to);
    deviceFilter(deviceType, clauses, params);
    clauses.push("type = 'click'", 'zone IS NOT NULL');

    if (pageGroup) {
      clauses.push('page_group = :pageGroup');
      params.pageGroup = pageGroup;
    } else {
      clauses.push('path = :path');
      params.path = path;
    }

    const rows = await all(
      `SELECT zone,
              COUNT(*) as clicks,
              COUNT(DISTINCT session) as sessions,
              COUNT(DISTINCT visitor_id) as uv
       FROM events WHERE ${clauses.join(' AND ')}
       GROUP BY zone ORDER BY clicks DESC`,
      params
    );

    const total = rows.reduce((s, r) => s + Number(r.clicks), 0);
    res.json(rows.map(r => ({ ...r, pct: total ? +((r.clicks / total) * 100).toFixed(1) : 0 })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.get('/heatmap-data', async (req, res) => {
  try {
    const { path, from, to, type = 'click', deviceType = 'all', variant = 'all' } = req.query;
    if (!path) return res.status(400).json({ error: 'path is required' });

    const { clauses, params } = timeFilter(from, to);
    deviceFilter(deviceType, clauses, params);
    variantFilter(variant, clauses, params);
    clauses.push('path = :path', 'type = :type', 'x IS NOT NULL', 'y IS NOT NULL');
    params.path = path; params.type = type;

    const rows = await all(
      `SELECT x, y, page_width as pageWidth, page_height as pageHeight FROM events WHERE ${clauses.join(' AND ')} LIMIT 20000`,
      params
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.get('/scroll-depth', async (req, res) => {
  try {
    const { path, from, to, deviceType = 'all', variant = 'all' } = req.query;
    if (!path) return res.status(400).json({ error: 'path is required' });

    const { clauses, params } = timeFilter(from, to);
    deviceFilter(deviceType, clauses, params);
    variantFilter(variant, clauses, params);
    clauses.push('path = :path', "type = 'scroll'");
    params.path = path;

    const sessions = await all(
      `SELECT session, MAX(y) as maxY FROM events WHERE ${clauses.join(' AND ')} GROUP BY session`,
      params
    );

    const total = sessions.length;
    const thresholds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const data = thresholds.map((depth) => {
      const reached = sessions.filter((s) => s.maxY >= depth).length;
      return { depth, sessions: reached, pct: total ? +((reached / total) * 100).toFixed(1) : 0 };
    });
    res.json({ total, data });
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.get('/element-clicks', async (req, res) => {
  try {
    const { path, from, to, deviceType = 'all', variant = 'all' } = req.query;
    if (!path) return res.status(400).json({ error: 'path is required' });

    const { clauses, params } = timeFilter(from, to);
    deviceFilter(deviceType, clauses, params);
    variantFilter(variant, clauses, params);
    clauses.push('path = :path', "type = 'click'", 'selector IS NOT NULL');
    params.path = path;

    const rows = await all(
      `SELECT selector, tag_name as tagName, MAX(element_text) as elementText, COUNT(*) as count
       FROM events WHERE ${clauses.join(' AND ')}
       GROUP BY selector, tag_name ORDER BY count DESC LIMIT 20`,
      params
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.get('/screenshot', async (req, res) => {
  try {
    const { path, deviceType = 'desktop' } = req.query;
    if (!path) return res.status(400).json({ error: 'path is required' });

    const row = await get(
      `SELECT filename,
              viewport_width  as viewportWidth,
              viewport_height as viewportHeight,
              page_width      as pageWidth,
              page_height     as pageHeight,
              ts
       FROM screenshots WHERE path = :path AND device_type = :deviceType`,
      { path, deviceType }
    );

    if (!row) return res.status(404).json({ error: 'screenshot not found' });
    res.json({
      url: `/screenshots/${row.filename}?t=${row.ts}`,
      viewportWidth: row.viewportWidth,
      viewportHeight: row.viewportHeight,
      pageWidth: row.pageWidth,
      pageHeight: row.pageHeight,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.get('/live-recent', async (req, res) => {
  try {
    const { path, minutes = '5', from, to, deviceType = 'all', variant = 'all' } = req.query;
    if (!path) return res.status(400).json({ error: 'path is required' });

    const clauses = ['path = :path', "type = 'click'", 'x IS NOT NULL', 'y IS NOT NULL'];
    const params = { path };

    clauses.push('ts >= :from');
    params.from = from ? Number(from) : Date.now() - Number(minutes) * 60 * 1000;
    if (to) { clauses.push('ts <= :to'); params.to = Number(to); }
    deviceFilter(deviceType, clauses, params);
    variantFilter(variant, clauses, params);

    const rows = await all(
      `SELECT x, y, selector, tag_name as tagName, element_text as elementText,
              device_type as deviceType, ts, session, visitor_id as visitorId, variant
       FROM events WHERE ${clauses.join(' AND ')}
       ORDER BY ts DESC LIMIT 1000`,
      params
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.get('/path-plot', async (req, res) => {
  try {
    const { path, from, to, deviceType = 'all', limit = '10' } = req.query;
    if (!path) return res.status(400).json({ error: 'path is required' });

    const { clauses, params } = timeFilter(from, to);
    deviceFilter(deviceType, clauses, params);
    clauses.push('path = :path', "type = 'click'", 'selector IS NOT NULL');
    params.path = path;

    const clicks = await all(
      `SELECT session, selector, tag_name as tagName, element_text as elementText, ts, x, y
       FROM events WHERE ${clauses.join(' AND ')}
       ORDER BY session, ts ASC LIMIT 50000`,
      params
    );

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
        sequence.push({ label: stepLabel(click), tagName: click.tagName, selector: click.selector, x: click.x, y: click.y });
        prevKey = key;
        if (sequence.length >= 8) break;
      }
      if (sequence.length < 2) continue;
      sessionSamples.push({ session, steps: sequence, startedAt: sessionClicks[0].ts, clickCount: sessionClicks.length });
      const pathKey = sequence.map((s) => s.selector || s.label).join('\0');
      const existing = pathCounts.get(pathKey);
      if (existing) existing.count += 1;
      else pathCounts.set(pathKey, { count: 1, steps: sequence });
    }

    const totalSessions = sessionSamples.length;
    const maxPaths = Math.min(Number(limit) || 10, 20);
    const paths = [...pathCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, maxPaths)
      .map((p, i) => ({ rank: i + 1, count: p.count, pct: totalSessions ? +((p.count / totalSessions) * 100).toFixed(1) : 0, steps: p.steps }));

    sessionSamples.sort((a, b) => b.startedAt - a.startedAt);
    res.json({ totalSessions, totalClicks: clicks.length, paths, sessions: sessionSamples.slice(0, 12) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.get('/timeline', async (req, res) => {
  try {
    const { path, type = 'click', interval = 'day' } = req.query;
    if (!path) return res.status(400).json({ error: 'path is required' });
    const format = interval === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d';
    const rows = await all(
      `SELECT strftime('${format}', ts / 1000, 'unixepoch') as bucket, COUNT(*) as count
       FROM events WHERE path = :path AND type = :type GROUP BY bucket ORDER BY bucket`,
      { path, type }
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.get('/analytics', async (req, res) => {
  try {
    const { path, from, to, deviceType = 'all', variant = 'all' } = req.query;
    if (!path) return res.status(400).json({ error: 'path is required' });

    const { clauses, params } = timeFilter(from, to);
    deviceFilter(deviceType, clauses, params);
    variantFilter(variant, clauses, params);
    clauses.push('path = :path');
    params.path = path;
    const where = clauses.join(' AND ');

    const totals = await get(
      `SELECT SUM(CASE WHEN type='click'    THEN 1 ELSE 0 END) as clicks,
              SUM(CASE WHEN type='scroll'   THEN 1 ELSE 0 END) as scrolls,
              SUM(CASE WHEN type='pageview' THEN 1 ELSE 0 END) as pageviews,
              COUNT(DISTINCT session)    as sessions,
              COUNT(DISTINCT visitor_id) as uv
       FROM events WHERE ${where}`,
      params
    );

    const sessionClauses = ['landing_path = :path'];
    const sessionParams  = { path };
    if (from) { sessionClauses.push('started_at >= :from'); sessionParams.from = Number(from); }
    if (to)   { sessionClauses.push('started_at <= :to');   sessionParams.to   = Number(to);   }

    const sessionStats = await get(
      `SELECT COUNT(*) as sessionCount,
              AVG(last_activity_at - started_at) as avgDwellMs,
              SUM(CASE WHEN pageview_count <= 1 AND click_count = 0
                        AND (last_activity_at - started_at) < 10000 THEN 1 ELSE 0 END) as bounces
       FROM sessions WHERE ${sessionClauses.join(' AND ')}`,
      sessionParams
    );

    const dailyUv = await all(
      `SELECT strftime('%Y-%m-%d', ts / 1000, 'unixepoch') as day,
              COUNT(DISTINCT visitor_id) as uv
       FROM events WHERE ${where} AND visitor_id IS NOT NULL GROUP BY day ORDER BY day`,
      params
    );

    const sessionCount = sessionStats?.sessionCount ?? 0;
    const bounces = sessionStats?.bounces ?? 0;
    res.json({
      clicks: totals?.clicks ?? 0, scrolls: totals?.scrolls ?? 0,
      pageviews: totals?.pageviews ?? 0, sessions: totals?.sessions ?? 0,
      uv: totals?.uv ?? 0,
      avgDwellMs: Math.round(sessionStats?.avgDwellMs ?? 0),
      bounceRate: sessionCount ? +((bounces / sessionCount) * 100).toFixed(1) : 0,
      dailyUv,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.get('/funnel', async (req, res) => {
  try {
    const { steps, from, to, deviceType = 'all' } = req.query;
    if (!steps) return res.status(400).json({ error: 'steps is required' });

    const stepList = String(steps).split(',').map((s) => s.trim()).filter(Boolean);
    if (stepList.length < 2) return res.status(400).json({ error: 'at least 2 steps required' });

    const { clauses, params } = timeFilter(from, to);
    deviceFilter(deviceType, clauses, params);
    clauses.push("type = 'pageview'");
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const pageviews = await all(
      `SELECT session, path, ts FROM events ${where} ORDER BY session, ts ASC`,
      params
    );

    const bySession = new Map();
    for (const pv of pageviews) {
      if (!bySession.has(pv.session)) bySession.set(pv.session, []);
      const list = bySession.get(pv.session);
      if (list[list.length - 1]?.path !== pv.path) list.push({ path: pv.path, ts: pv.ts });
    }

    const funnel = stepList.map((step) => ({ step, label: step, count: 0, pct: 0 }));
    let entered = 0;
    for (const sequence of bySession.values()) {
      let stepIdx = 0;
      for (const { path: p } of sequence) {
        if (stepIdx < stepList.length && p === stepList[stepIdx]) stepIdx++;
      }
      if (stepIdx > 0) entered += 1;
      for (let i = 0; i < stepIdx; i++) funnel[i].count += 1;
    }

    const base = funnel[0]?.count || 0;
    for (const step of funnel) step.pct = base ? +((step.count / base) * 100).toFixed(1) : 0;

    res.json({ steps: funnel, totalSessions: bySession.size, entered });
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

export default router;
