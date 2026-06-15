import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl, wsUrl } from '../api.js';

function pruneClicks(clicks, windowMinutes) {
  const cutoff = Date.now() - windowMinutes * 60 * 1000;
  return clicks.filter((c) => c.ts >= cutoff);
}

export function useLiveFeed({ path, deviceType, windowMinutes, enabled }) {
  const [clicks, setClicks] = useState([]);
  const [feed, setFeed] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const windowMinutesRef = useRef(windowMinutes);

  windowMinutesRef.current = windowMinutes;

  const addClick = useCallback((click) => {
    const cutoff = Date.now() - windowMinutesRef.current * 60 * 1000;
    if (click.ts < cutoff) return;

    setClicks((prev) => pruneClicks([...prev, click], windowMinutesRef.current));
    setFeed((prev) =>
      [{ ...click, _key: `${click.ts}-${click.session}-${click.x}` }, ...prev]
        .slice(0, 30)
    );
  }, []);

  // 초기 데이터 + 윈도우 변경 시 재로드
  useEffect(() => {
    if (!enabled || !path) {
      setClicks([]);
      setFeed([]);
      return;
    }

    let cancelled = false;
    fetch(
      apiUrl(
        `/api/live-recent?path=${encodeURIComponent(path)}&minutes=${windowMinutes}&deviceType=${deviceType}`
      )
    )
      .then((res) => res.json())
      .then((rows) => {
        if (cancelled) return;
        const pruned = pruneClicks(rows, windowMinutes);
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
  }, [path, deviceType, windowMinutes, enabled]);

  // WebSocket 연결
  useEffect(() => {
    if (!enabled || !path) return;

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
  }, [path, deviceType, enabled, addClick]);

  // 구독 갱신 (path/device 변경 시 연결 유지)
  useEffect(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', path, deviceType }));
    }
  }, [path, deviceType]);

  // 오래된 클릭 주기적 제거
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setClicks((prev) => pruneClicks(prev, windowMinutesRef.current));
      setFeed((prev) => pruneClicks(prev, windowMinutesRef.current).slice(0, 30));
    }, 5000);
    return () => clearInterval(interval);
  }, [enabled, windowMinutes]);

  const stats = useMemo(() => {
    const now = Date.now();
    const oneMinAgo = now - 60 * 1000;
    const windowStart = now - windowMinutes * 60 * 1000;
    const inWindow = clicks.filter((c) => c.ts >= windowStart);
    const lastMinute = inWindow.filter((c) => c.ts >= oneMinAgo);
    const sessions = new Set(inWindow.map((c) => c.session).filter(Boolean));
    return {
      windowClicks: inWindow.length,
      minuteClicks: lastMinute.length,
      activeSessions: sessions.size,
    };
  }, [clicks, windowMinutes]);

  return { clicks, feed, connected, stats };
}
