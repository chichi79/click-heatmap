import db from './db.js';

const upsertStmt = db.prepare(`
  INSERT INTO sessions (
    session_id, visitor_id, landing_path,
    started_at, ended_at, last_activity_at,
    pageview_count, click_count, scroll_count
  ) VALUES (
    @sessionId, @visitorId, @landingPath,
    @startedAt, @endedAt, @lastActivityAt,
    @pageviews, @clicks, @scrolls
  )
  ON CONFLICT(session_id) DO UPDATE SET
    visitor_id = COALESCE(excluded.visitor_id, sessions.visitor_id),
    ended_at = excluded.ended_at,
    last_activity_at = excluded.last_activity_at,
    pageview_count = sessions.pageview_count + excluded.pageview_count,
    click_count = sessions.click_count + excluded.click_count,
    scroll_count = sessions.scroll_count + excluded.scroll_count
`);

export function updateSessionsFromEvents(rows) {
  const bySession = new Map();

  for (const e of rows) {
    if (!e.session) continue;

    if (!bySession.has(e.session)) {
      bySession.set(e.session, {
        sessionId: e.session,
        visitorId: e.visitorId ?? null,
        landingPath: e.path,
        startedAt: e.ts,
        endedAt: e.ts,
        lastActivityAt: e.ts,
        pageviews: 0,
        clicks: 0,
        scrolls: 0,
      });
    }

    const s = bySession.get(e.session);
    if (e.ts < s.startedAt) {
      s.startedAt = e.ts;
      s.landingPath = e.path;
    }
    if (e.ts > s.endedAt) s.endedAt = e.ts;
    if (e.ts > s.lastActivityAt) s.lastActivityAt = e.ts;
    if (!s.visitorId && e.visitorId) s.visitorId = e.visitorId;

    if (e.type === 'pageview') s.pageviews += 1;
    else if (e.type === 'click') s.clicks += 1;
    else if (e.type === 'scroll') s.scrolls += 1;
  }

  for (const s of bySession.values()) {
    upsertStmt.run({
      sessionId: s.sessionId,
      visitorId: s.visitorId,
      landingPath: s.landingPath,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      lastActivityAt: s.lastActivityAt,
      pageviews: s.pageviews,
      clicks: s.clicks,
      scrolls: s.scrolls,
    });
  }
}
