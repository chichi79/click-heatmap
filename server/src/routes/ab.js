import { Router } from 'express';
import { all, get, run } from '../db.js';

const router = Router();

function hashBucket(visitorId, experimentId) {
  const key = `${visitorId}:${experimentId}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 100;
}

function pickVariant(visitorId, experimentId, variants, split) {
  const bucket = hashBucket(visitorId, experimentId);
  let cumulative = 0;
  for (const v of variants) {
    cumulative += split[v] ?? Math.floor(100 / variants.length);
    if (bucket < cumulative) return v;
  }
  return variants[variants.length - 1];
}

function parseExperiment(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, path: row.path,
    variants: JSON.parse(row.variants),
    split: JSON.parse(row.split_json),
    goalSelector: row.goal_selector,
    status: row.status, createdAt: row.created_at,
  };
}

function normalizeSplit(variants, split) {
  const result = {};
  let total = 0;
  for (const v of variants) {
    const val = Number(split?.[v]);
    result[v] = Number.isFinite(val) && val > 0 ? val : 0;
    total += result[v];
  }
  if (total !== 100) {
    const each = Math.floor(100 / variants.length);
    const remainder = 100 - each * variants.length;
    variants.forEach((v, i) => { result[v] = each + (i === 0 ? remainder : 0); });
  }
  return result;
}

// SDK: path별 활성 실험 + variant 배정
router.get('/ab/config', async (req, res) => {
  try {
    const { path, visitorId } = req.query;
    if (!path || !visitorId) return res.json([]);

    const experiments = await all(
      `SELECT * FROM experiments WHERE status = 'active' AND path = :path ORDER BY created_at DESC`,
      { path }
    );

    const result = [];
    for (const exp of experiments) {
      const parsed = parseExperiment(exp);
      let assignment = await get(
        `SELECT variant FROM assignments WHERE visitor_id = :visitorId AND experiment_id = :experimentId`,
        { visitorId, experimentId: exp.id }
      );

      let variant = assignment?.variant;
      if (!variant) {
        variant = pickVariant(visitorId, exp.id, parsed.variants, parsed.split);
        try {
          await run(
            `INSERT INTO assignments (visitor_id, experiment_id, variant, assigned_at)
             VALUES (:visitorId, :experimentId, :variant, :assignedAt)`,
            { visitorId, experimentId: exp.id, variant, assignedAt: Date.now() }
          );
        } catch {
          const row = await get(
            `SELECT variant FROM assignments WHERE visitor_id = :visitorId AND experiment_id = :experimentId`,
            { visitorId, experimentId: exp.id }
          );
          variant = row?.variant ?? variant;
        }
      }

      result.push({
        experimentId: exp.id, name: parsed.name, path: parsed.path,
        variant, goalSelector: parsed.goalSelector, variants: parsed.variants,
      });
    }
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.get('/ab/experiments', async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM experiments ORDER BY created_at DESC`);
    res.json(rows.map(parseExperiment));
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.post('/ab/experiments', async (req, res) => {
  try {
    const { name, path, variants, split, goalSelector } = req.body;
    if (!name || !path || !Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({ error: 'name, path, variants(2+) are required' });
    }

    const activeConflict = await get(
      `SELECT id FROM experiments WHERE status = 'active' AND path = :path LIMIT 1`,
      { path }
    );
    if (activeConflict) {
      return res.status(409).json({ error: 'active experiment already exists for this path', experimentId: activeConflict.id });
    }

    const splitNorm = normalizeSplit(variants, split ?? {});
    const result = await run(
      `INSERT INTO experiments (name, path, variants, split_json, goal_selector, status, created_at)
       VALUES (:name, :path, :variants, :splitJson, :goalSelector, 'active', :createdAt)`,
      {
        name: String(name).slice(0, 120), path: String(path),
        variants: JSON.stringify(variants), splitJson: JSON.stringify(splitNorm),
        goalSelector: goalSelector ? String(goalSelector).slice(0, 500) : null,
        createdAt: Date.now(),
      }
    );

    const row = await get(`SELECT * FROM experiments WHERE id = :id`, { id: result.lastInsertRowid });
    res.status(201).json(parseExperiment(row));
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.patch('/ab/experiments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!id || !['active', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'valid status (active|paused) required' });
    }

    if (status === 'active') {
      const exp = await get(`SELECT path FROM experiments WHERE id = :id`, { id });
      if (!exp) return res.status(404).json({ error: 'not found' });

      const conflict = await get(
        `SELECT id FROM experiments WHERE status = 'active' AND path = :path AND id != :id LIMIT 1`,
        { path: exp.path, id }
      );
      if (conflict) return res.status(409).json({ error: 'another active experiment exists for this path' });
    }

    await run(`UPDATE experiments SET status = :status WHERE id = :id`, { id, status });
    const row = await get(`SELECT * FROM experiments WHERE id = :id`, { id });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(parseExperiment(row));
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

router.get('/ab/results', async (req, res) => {
  try {
    const { experimentId, from, to } = req.query;
    const id = Number(experimentId);
    if (!id) return res.status(400).json({ error: 'experimentId is required' });

    const exp = parseExperiment(await get(`SELECT * FROM experiments WHERE id = :id`, { id }));
    if (!exp) return res.status(404).json({ error: 'experiment not found' });

    const clauses = ['experiment_id = :experimentId'];
    const params = { experimentId: id };
    if (from) { clauses.push('ts >= :from'); params.from = Number(from); }
    if (to)   { clauses.push('ts <= :to');   params.to   = Number(to);   }
    const where = clauses.join(' AND ');

    const byVariant = await all(
      `SELECT variant,
              SUM(CASE WHEN type='pageview' THEN 1 ELSE 0 END) as pageviews,
              SUM(CASE WHEN type='click'    THEN 1 ELSE 0 END) as clicks,
              COUNT(DISTINCT visitor_id) as uv,
              COUNT(DISTINCT session)    as sessions
       FROM events WHERE ${where} AND variant IS NOT NULL GROUP BY variant`,
      params
    );

    const variantResults = await Promise.all(exp.variants.map(async (v) => {
      const row = byVariant.find((r) => r.variant === v) ?? { variant: v, pageviews: 0, clicks: 0, uv: 0, sessions: 0 };
      let conversions = 0;
      if (exp.goalSelector) {
        const c = await get(
          `SELECT COUNT(*) as c FROM events WHERE ${where} AND variant = :variant AND type = 'click' AND selector = :goalSelector`,
          { ...params, variant: v, goalSelector: exp.goalSelector }
        );
        conversions = c?.c ?? 0;
      }
      const conversionRate = row.pageviews ? +((conversions / row.pageviews) * 100).toFixed(2) : 0;
      return { variant: v, pageviews: row.pageviews, clicks: row.clicks, uv: row.uv, sessions: row.sessions, conversions, conversionRate };
    }));

    const base = variantResults[0];
    const withUplift = variantResults.map((r, i) => ({
      ...r,
      uplift: i > 0 && base?.conversionRate
        ? +(((r.conversionRate - base.conversionRate) / base.conversionRate) * 100).toFixed(1)
        : null,
    }));

    const assignments = await all(
      `SELECT variant, COUNT(*) as count FROM assignments WHERE experiment_id = :experimentId GROUP BY variant`,
      { experimentId: id }
    );

    res.json({ experiment: exp, variants: withUplift, assignments });
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

export default router;
