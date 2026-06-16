import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl, wsUrl } from '../api.js';

function pruneByWindow(clicks, windowMinutes) {
  const cutoff = Date.now() - windowMinutes * 60 * 1000;
  return clicks.filter((c) => c.ts >= cutoff);
}

function pruneByRange(clicks, fromEpoch, toEpoch) {
  return clicks.filter((c) => {
    if (fromEpoch && c.ts < fromEpoch) return false;
    if (toEpoch && c.ts > toEpoch) return false;
    return true;
  });
}

export function useLiveFeed({
  path,
  deviceType,
  variant = 'all',
  windowMinutes,
  from,
  to,
  useCustomRange,
  enabled,
}) {
  const [clicks, setClicks] = useState([]);
  const [feed, setFeed] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const windowMinutesRef = useRef(windowMinutes);
  const rangeRef = useRef({ from, to, useCustomRange });

  windowMinutesRef.current = windowMinutes;
  rangeRef.current = { from, to, useCustomRange };

  const fromEpoch = useCustomRange && from ? new Date(from).getTime() : null;
  const toEpoch = useCustomRange && to ? new Date(to).getTime() : null;
  const liveWs = enabled && !useCustomRange;

  const prune = useCallback(
    (rows) => {
      if (useCustomRange) return pruneByRange(rows, fromEpoch, toEpoch);
      return pruneByWindow(rows, windowMinutesRef.current);
    },
    [useCustomRange, fromEpoch, toEpoch]
  );

  const addClick = useCallback(
    (click) => {
      const { useCustomRange: custom, from: f, to: t } = rangeRef.current;
      const fromMs = custom && f ? new Date(f).getTime() : null;
      const toMs = custom && t ? new Date(t).getTime() : null;

      if (custom) {
        if (fromMs && click.ts < fromMs) return;
        if (toMs && click.ts > toMs) return;
      } else {
        const cutoff = Date.now() - windowMinutesRef.current * 60 * 1000;
        if (click.ts < cutoff) return;
      }

      setClicks((prev) => pruneByWindow([...prev, click], windowMinutesRef.current));
      setFeed((prev) =>
        [{ ...click, _key: `${click.ts}-${click.session}-${click.x}` }, ...prev].slice(0, 30)
      );
    },
    []
  );

  useEffect(() => {
    if (!enabled || !path) {
      setClicks([]);
      setFeed([]);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      path,
      deviceType,
    });
    if (variant && variant !== 'all') params.set('variant', variant);

    if (useCustomRange && fromEpoch) {
      params.set('from', String(fromEpoch));
      if (toEpoch) params.set('to', String(toEpoch));
    } else {
      params.set('minutes', String(windowMinutes));
    }

    fetch(apiUrl(`/api/live-recent?${params.toString()}`))
      .then((res) => res.json())
      .then((rows) => {
        if (cancelled) return;
        const pruned = prune(rows);
        setClicks(pruned);
        setFeed(
          pruned
            .slice()
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 30)
            .map((c) => ({ ...c, _key: `${c.ts}-${c.session}-${c.x}` }))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setClicks([]);
          setFeed([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, deviceType, variant, windowMinutes, enabled, useCustomRange, fromEpoch, toEpoch, prune]);

  useEffect(() => {
    if (!liveWs || !path) {
      setConnected(false);
      return;
    }

    const ws = new WebSocket(wsUrl('/ws/live'));
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe', path, deviceType }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'click') addClick(msg);
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [path, deviceType, liveWs, addClick]);

  useEffect(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', path, deviceType }));
    }
  }, [path, deviceType]);

  useEffect(() => {
    if (!enabled || useCustomRange) return;
    const interval = setInterval(() => {
      setClicks((prev) => pruneByWindow(prev, windowMinutesRef.current));
      setFeed((prev) => pruneByWindow(prev, windowMinutesRef.current).slice(0, 30));
    }, 5000);
    return () => clearInterval(interval);
  }, [enabled, useCustomRange, windowMinutes]);

  const stats = useMemo(() => {
    const now = Date.now();
    const oneMinAgo = now - 60 * 1000;
    const inWindow = prune(clicks);
    const lastMinute = inWindow.filter((c) => c.ts >= oneMinAgo);
    const sessions = new Set(inWindow.map((c) => c.session).filter(Boolean));
    const visitors = new Set(inWindow.map((c) => c.visitorId).filter(Boolean));
    return {
      windowClicks: inWindow.length,
      minuteClicks: lastMinute.length,
      activeSessions: sessions.size,
      activeVisitors: visitors.size,
    };
  }, [clicks, prune]);

  return { clicks, feed, connected: liveWs && connected, stats };
}
