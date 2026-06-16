// heatmap-sdk.js
// 삽입: <script src="https://your-internal.server/heatmap-sdk.js" defer></script>
(function () {
  const VISITOR_KEY = 'hm_visitor_id';
  const VISITOR_TTL = 30 * 24 * 60 * 60 * 1000;
  const SESSION_KEY = 'hm_session_id';
  const SESSION_START_KEY = 'hm_session_start';

  function getVisitorId() {
    try {
      const raw = localStorage.getItem(VISITOR_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.id && Date.now() - data.ts < VISITOR_TTL) return data.id;
      }
    } catch (e) {
      /* noop */
    }
    const id = crypto.randomUUID();
    try {
      localStorage.setItem(VISITOR_KEY, JSON.stringify({ id, ts: Date.now() }));
    } catch (e) {
      /* noop */
    }
    return id;
  }

  function getSessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(SESSION_KEY, id);
        sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
      }
      return id;
    } catch (e) {
      return crypto.randomUUID();
    }
  }

  function getSessionStart() {
    try {
      return Number(sessionStorage.getItem(SESSION_START_KEY)) || Date.now();
    } catch (e) {
      return Date.now();
    }
  }

  const VISITOR_ID = getVisitorId();
  const SESSION = getSessionId();
  const SESSION_START = getSessionStart();

  const ENDPOINT = (function () {
    const script =
      document.currentScript ||
      document.querySelector('script[src*="heatmap-sdk"]');
    try {
      return new URL('/api/heatmap', script.src).toString();
    } catch (e) {
      return '/api/heatmap';
    }
  })();

  const SERVER_ORIGIN = (function () {
    try {
      return new URL(ENDPOINT).origin;
    } catch (e) {
      return '';
    }
  })();

  const DB_NAME = 'heatmap-sdk';
  const STORE = 'queue';
  const FLUSH_SIZE = 50;
  const FLUSH_INTERVAL = 5000;

  let buf = [];
  let maxScrollDepth = 0;

  function getDeviceType(innerWidth) {
    if (innerWidth < 768) return 'mobile';
    if (innerWidth < 1024) return 'tablet';
    return 'desktop';
  }

  function deviceContext() {
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      screenWidth: window.screen.width,
      devicePixelRatio: window.devicePixelRatio || 1,
      deviceType: getDeviceType(window.innerWidth),
    };
  }

  function pageMetrics() {
    const doc = document.documentElement;
    const pageWidth = Math.max(doc.scrollWidth, document.body.scrollWidth, window.innerWidth);
    const pageHeight = Math.max(doc.scrollHeight, document.body.scrollHeight);
    return { pageWidth, pageHeight };
  }

  /** 클릭 위치를 페이지 전체 기준 %로 변환 (스크롤 포함) */
  function clickPageCoords(e) {
    const { pageWidth, pageHeight } = pageMetrics();
    const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    return {
      x: +(((scrollX + e.clientX) / pageWidth) * 100).toFixed(2),
      y: +(((scrollY + e.clientY) / pageHeight) * 100).toFixed(2),
    };
  }

  function getSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    const parts = [];
    let node = el;
    while (node && node !== document.body && node.nodeType === 1) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += '#' + CSS.escape(node.id);
        parts.unshift(part);
        break;
      }
      if (node.className && typeof node.className === 'string') {
        const cls = node.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
        if (cls.length) part += '.' + cls.map(CSS.escape).join('.');
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ').slice(0, 500);
  }

  function getElementMeta(target) {
    if (!target || target.nodeType !== 1) {
      return { selector: null, tagName: null, elementText: null };
    }
    return {
      selector: getSelector(target),
      tagName: target.tagName.toLowerCase(),
      elementText: (target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    };
  }

  // ---- 오프라인 폴백 (IndexedDB) ----
  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('no indexeddb'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveOffline(events) {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      events.forEach((e) => store.add(e));
    } catch (e) {
      /* noop */
    }
  }

  async function flushOfflineQueue() {
    try {
      const db = await openDb();
      const all = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (!all.length) return;
      const ok = navigator.sendBeacon(ENDPOINT, JSON.stringify(all));
      if (ok) {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
      }
    } catch (e) {
      /* noop */
    }
  }

  function send(events) {
    if (!events.length) return;
    if (navigator.onLine === false) {
      saveOffline(events);
      return;
    }
    const ok = navigator.sendBeacon(ENDPOINT, JSON.stringify(events));
    if (!ok) saveOffline(events);
  }

  function flush() {
    if (!buf.length) return;
    send(buf.splice(0));
  }

  function track(event) {
    buf.push(event);
    if (buf.length >= FLUSH_SIZE) flush();
  }

  function baseEvent(extra) {
    return {
      path: location.pathname,
      session: SESSION,
      visitorId: VISITOR_ID,
      ts: Date.now(),
      ...deviceContext(),
      selector: null,
      tagName: null,
      elementText: null,
      ...extra,
    };
  }

  function trackPageview() {
    track(
      baseEvent({
        type: 'pageview',
        x: null,
        y: null,
      })
    );
  }

  function trackSessionEnd() {
    track(
      baseEvent({
        type: 'session_end',
        x: null,
        y: null,
        dwellMs: Date.now() - SESSION_START,
      })
    );
  }

  // ---- 페이지뷰 (최초 + SPA 이동) ----
  trackPageview();

  const origPushState = history.pushState;
  history.pushState = function (...args) {
    origPushState.apply(this, args);
    trackPageview();
  };
  window.addEventListener('popstate', trackPageview);

  // ---- 클릭 좌표 + 요소 정보 수집 ----
  document.addEventListener('click', (e) => {
    const meta = getElementMeta(e.target);
    const coords = clickPageCoords(e);
    track({
      type: 'click',
      x: coords.x,
      y: coords.y,
      ...baseEvent(),
      ...meta,
    });
  });

  // ---- 스크롤 깊이 수집 ----
  function computeScrollDepth() {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const docHeight = Math.max(doc.scrollHeight, document.body.scrollHeight);
    const winHeight = window.innerHeight;
    if (docHeight <= winHeight) return 100;
    return Math.min(100, +(((scrollTop + winHeight) / docHeight) * 100).toFixed(2));
  }

  let scrollTicking = false;
  document.addEventListener(
    'scroll',
    () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        const depth = computeScrollDepth();
        if (depth > maxScrollDepth) {
          maxScrollDepth = depth;
          track({
            type: 'scroll',
            x: null,
            y: depth,
            ...baseEvent(),
          });
        }
        scrollTicking = false;
      });
    },
    { passive: true }
  );

  // ---- 페이지 스크린샷 캡처 (세션당 1회) ----
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function hideFixedInClone(root) {
    if (!root) return;
    root.querySelectorAll('*').forEach((el) => {
      try {
        const view = el.ownerDocument && el.ownerDocument.defaultView;
        if (!view) return;
        const pos = view.getComputedStyle(el).position;
        if (pos === 'fixed' || pos === 'sticky') {
          el.style.visibility = 'hidden';
        }
      } catch (e) {
        /* noop */
      }
    });
  }

  /**
   * 전체 페이지 캡처 — 사용자 화면 스크롤 없음.
   * html2canvas가 내부 DOM 클론으로 렌더링하고, 부족 시 화면 밖 클론으로 재시도.
   */
  async function captureFullPageSilent(scale) {
    const { pageWidth, pageHeight } = pageMetrics();
    const opts = {
      scale,
      useCORS: true,
      logging: false,
      width: pageWidth,
      height: pageHeight,
      windowWidth: pageWidth,
      windowHeight: pageHeight,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (doc) => hideFixedInClone(doc.body),
    };

    let canvas = await html2canvas(document.documentElement, opts);
    const expectedH = Math.round(pageHeight * scale);

    if (canvas.height < expectedH * 0.85) {
      const host = document.createElement('div');
      host.setAttribute('aria-hidden', 'true');
      host.setAttribute('data-heatmap-capture', '1');
      host.style.cssText =
        'position:fixed;left:-100000px;top:0;overflow:visible;visibility:hidden;pointer-events:none;';
      const clone = document.body.cloneNode(true);
      host.style.width = pageWidth + 'px';
      host.style.height = pageHeight + 'px';
      host.appendChild(clone);
      document.body.appendChild(host);

      try {
        hideFixedInClone(clone);
        canvas = await html2canvas(clone, opts);
      } finally {
        host.remove();
      }
    }

    return canvas;
  }

  async function captureScreenshot() {
    const ctx = deviceContext();
    const storageKey = `hm-ss-v5-${location.pathname}-${ctx.deviceType}`;
    if (sessionStorage.getItem(storageKey)) return;

    try {
      await loadScript(SERVER_ORIGIN + '/html2canvas.min.js');
      await new Promise((r) => setTimeout(r, 1500));

      const { pageWidth, pageHeight } = pageMetrics();
      const scale = Math.min(1, 1400 / window.innerWidth);

      const canvas = await captureFullPageSilent(scale);
      const image = canvas.toDataURL('image/jpeg', 0.72);
      const res = await fetch(SERVER_ORIGIN + '/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: location.pathname,
          viewportWidth: ctx.viewportWidth,
          viewportHeight: ctx.viewportHeight,
          pageWidth,
          pageHeight,
          deviceType: ctx.deviceType,
          image,
        }),
      });

      if (res.ok) sessionStorage.setItem(storageKey, '1');
    } catch (e) {
      /* 캡처 실패 시 조용히 무시 */
    }
  }

  function scheduleScreenshot() {
    const run = () => setTimeout(captureScreenshot, 500);
    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, { timeout: 4000 });
    } else {
      run();
    }
  }

  if (document.readyState === 'complete') {
    scheduleScreenshot();
  } else {
    window.addEventListener('load', scheduleScreenshot);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      trackSessionEnd();
      flush();
    }
  });

  window.addEventListener('pagehide', () => {
    trackSessionEnd();
    flush();
  });

  window.addEventListener('online', flushOfflineQueue);

  setInterval(flush, FLUSH_INTERVAL);
  flushOfflineQueue();
})();
