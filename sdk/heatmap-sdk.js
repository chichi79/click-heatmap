// heatmap-sdk.js v1.1.1
// 삽입: <script src="https://your-internal.server/heatmap-sdk.js" defer></script>
(function () {
  // ---- 외부 설정 읽기 ----
  // SDK 로드 전에 설정:
  // window.__heatmapConfig = {
  //   pageGroups: [{ pattern: /^\/view\/\w+$/, group: 'news_article' }],
  //   zones: { title: '.article-title', body: '#article-body', comment: '#comment' },
  //   articleSelector: '#article-body',   // articleY 기준 엘리먼트
  // };
  const _cfg = window.__heatmapConfig || {};
  const _pageGroups  = Array.isArray(_cfg.pageGroups)  ? _cfg.pageGroups  : [];
  // 하위호환: urlPatterns → pageGroups 로도 동작
  const _urlPatterns = Array.isArray(_cfg.urlPatterns) ? _cfg.urlPatterns : [];
  const _zones       = _cfg.zones && typeof _cfg.zones === 'object' ? _cfg.zones : {};
  const _articleSel  = typeof _cfg.articleSelector === 'string' ? _cfg.articleSelector : null;

  // ---- 샘플링 ----
  // sampleRate: 0~1 (기본 1.0 = 전수 수집)
  // 예: 0.1 = 방문자의 10%만 수집
  const _sampleRate = typeof _cfg.sampleRate === 'number'
    ? Math.min(1, Math.max(0, _cfg.sampleRate))
    : 1.0;
  if (Math.random() > _sampleRate) return; // 샘플 밖이면 SDK 즉시 종료

  function normalizePath(pathname) {
    // urlPatterns (구형 — path 치환)
    for (const [pattern, replacement] of _urlPatterns) {
      if (pattern instanceof RegExp ? pattern.test(pathname) : pathname === pattern) {
        return typeof replacement === 'function' ? replacement(pathname) : replacement;
      }
    }
    return pathname;
  }

  function getPageGroup(pathname) {
    for (const { pattern, group } of _pageGroups) {
      if (pattern instanceof RegExp ? pattern.test(pathname) : pathname === pattern) {
        return group;
      }
    }
    return null;
  }

  function detectZone(target) {
    if (!target || !Object.keys(_zones).length) return null;
    let el = target;
    while (el && el !== document.body) {
      for (const [zoneName, selector] of Object.entries(_zones)) {
        try {
          if (el.matches(selector)) return zoneName;
        } catch (e) { /* noop */ }
      }
      // data-heatmap-zone 속성 직접 지정 지원
      const attr = el.getAttribute && el.getAttribute('data-heatmap-zone');
      if (attr) return attr;
      el = el.parentElement;
    }
    // data-heatmap-zone 없으면 null
    return target.closest ? (target.closest('[data-heatmap-zone]')?.getAttribute('data-heatmap-zone') ?? null) : null;
  }

  function getArticleY(clientY) {
    if (!_articleSel) return null;
    try {
      const articleEl = document.querySelector(_articleSel);
      if (!articleEl) return null;
      const rect = articleEl.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const absTop = rect.top + scrollY;
      const absClickY = clientY + scrollY;
      const relY = absClickY - absTop;
      if (relY < 0 || articleEl.offsetHeight <= 0) return null;
      return +((relY / articleEl.offsetHeight) * 100).toFixed(2);
    } catch (e) {
      return null;
    }
  }

  const VISITOR_KEY = 'hm_visitor_id';
  const VISITOR_TTL = 30 * 24 * 60 * 60 * 1000;
  const SESSION_KEY = 'hm_session_id';
  const SESSION_START_KEY = 'hm_session_start';

  function createId() {
    try {
      const randomUUID = globalThis.crypto?.randomUUID;
      if (typeof randomUUID === 'function') {
        return randomUUID.call(globalThis.crypto);
      }
    } catch (e) {
      /* HTTP 등 비보안 컨텍스트에서는 randomUUID 호출 불가 */
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function escapeCss(value) {
    const str = String(value);
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(str);
    }
    return str.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

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
    const id = createId();
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
        id = createId();
        sessionStorage.setItem(SESSION_KEY, id);
        sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
      }
      return id;
    } catch (e) {
      return createId();
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
    if (!script || !script.src) return '';
    try {
      return new URL('/api/heatmap', script.src).toString();
    } catch (e) {
      return '';
    }
  })();

  const SERVER_ORIGIN = (function () {
    if (!ENDPOINT) return '';
    try {
      return new URL(ENDPOINT).origin;
    } catch (e) {
      return '';
    }
  })();

  if (!ENDPOINT || !SERVER_ORIGIN) {
    return;
  }

  const DB_NAME = 'heatmap-sdk';
  const STORE = 'queue';
  const FLUSH_SIZE = 50;
  const FLUSH_INTERVAL = 5000;

  let buf = [];
  let maxScrollDepth = 0;
  let abAssignments = [];

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
    const body = document.body;
    const pageWidth = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0, window.innerWidth);
    const pageHeight = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0, window.innerHeight);
    return { pageWidth: pageWidth || window.innerWidth, pageHeight: pageHeight || window.innerHeight };
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
    try {
      const parts = [];
      let node = el;
      while (node && node !== document.body && node.nodeType === 1) {
        let part = node.tagName.toLowerCase();
        if (node.id) {
          part += '#' + escapeCss(node.id);
          parts.unshift(part);
          break;
        }
        if (node.className && typeof node.className === 'string') {
          const cls = node.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
          if (cls.length) part += '.' + cls.map(escapeCss).join('.');
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
    } catch (e) {
      return el.tagName ? el.tagName.toLowerCase() : 'unknown';
    }
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
    const ab = abAssignments[0] ?? null;
    return {
      path: normalizePath(location.pathname),
      pageGroup: getPageGroup(location.pathname),
      session: SESSION,
      visitorId: VISITOR_ID,
      ts: Date.now(),
      ...deviceContext(),
      selector: null,
      tagName: null,
      elementText: null,
      zone: null,
      articleY: null,
      ...(ab ? { experimentId: ab.experimentId, variant: ab.variant } : {}),
      ...extra,
    };
  }

  function exposeHeatmapApi() {
    refreshHeatmapApi();
  }

  async function loadAbConfig() {
    if (!SERVER_ORIGIN) return;
    try {
      const url =
        SERVER_ORIGIN +
        '/api/ab/config?path=' +
        encodeURIComponent(normalizePath(location.pathname)) +
        '&visitorId=' +
        encodeURIComponent(VISITOR_ID);
      const res = await fetch(url);
      if (res.ok) {
        abAssignments = await res.json();
        exposeHeatmapApi();
      }
    } catch (e) {
      /* noop */
    }
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
  let screenshotScheduleGen = 0;

  async function onRouteChange() {
    await loadAbConfig();
    trackPageview();
    scheduleScreenshot();
  }

  const origPushState = history.pushState;
  history.pushState = function (...args) {
    origPushState.apply(this, args);
    onRouteChange();
  };
  window.addEventListener('popstate', () => onRouteChange());

  loadAbConfig().then(() => {
    trackPageview();
    exposeHeatmapApi();
  });

  // ---- 클릭 좌표 + 요소 정보 수집 ----
  document.addEventListener('click', (e) => {
    try {
      const meta = getElementMeta(e.target);
      const coords = clickPageCoords(e);
      track(
        baseEvent({
          type: 'click',
          x: coords.x,
          y: coords.y,
          zone: detectZone(e.target),
          articleY: getArticleY(e.clientY),
          ...meta,
        })
      );
    } catch (err) {
      /* noop */
    }
  });

  // ---- 스크롤 깊이 수집 ----
  function computeScrollDepth() {
    const doc = document.documentElement;
    const body = document.body;
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const docHeight = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0, window.innerHeight);
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
          track(
            baseEvent({
              type: 'scroll',
              x: null,
              y: depth,
            })
          );
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

  function stripExternalImages(root) {
    if (!root) return;
    root.querySelectorAll('img').forEach((img) => {
      try {
        const src = img.currentSrc || img.src;
        if (!src) return;
        if (new URL(src, location.href).origin !== location.origin) {
          img.removeAttribute('src');
          img.removeAttribute('srcset');
          img.style.visibility = 'hidden';
        }
      } catch (e) {
        img.removeAttribute('src');
        img.removeAttribute('srcset');
      }
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
      onclone: (doc) => {
        hideFixedInClone(doc.body);
        stripExternalImages(doc.body);
      },
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

  const SCREENSHOT_MAX_ATTEMPTS = 3;
  const SCREENSHOT_RETRY_MS = [4000, 10000];
  const SCREENSHOT_DOM_QUIET_MS = 800;
  const SCREENSHOT_DOM_MAX_WAIT_MS = 12000;

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForNextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function waitForFonts() {
    try {
      if (document.fonts?.ready) {
        await Promise.race([document.fonts.ready, wait(3000)]);
      }
    } catch (e) {
      /* noop */
    }
  }

  async function waitForImages(root = document.body) {
    if (!root) return;
    const images = [...root.querySelectorAll('img')];
    const pending = images
      .filter((img) => !img.complete)
      .map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          })
      );
    if (pending.length) {
      await Promise.race([Promise.all(pending), wait(5000)]);
    }
  }

  function waitForDomStable(quietMs = SCREENSHOT_DOM_QUIET_MS, timeoutMs = SCREENSHOT_DOM_MAX_WAIT_MS) {
    return new Promise((resolve) => {
      let quietTimer = null;
      let deadline = null;

      const finish = () => {
        observer.disconnect();
        if (quietTimer) clearTimeout(quietTimer);
        if (deadline) clearTimeout(deadline);
        resolve();
      };

      const bump = () => {
        if (quietTimer) clearTimeout(quietTimer);
        quietTimer = setTimeout(finish, quietMs);
      };

      const observer = new MutationObserver(bump);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      bump();
      deadline = setTimeout(finish, timeoutMs);
    });
  }

  async function waitForPageReady() {
    await waitForFonts();
    await waitForDomStable();
    await waitForImages();
    await waitForNextFrame();
    await wait(300);
  }

  function isPageLikelyIncomplete() {
    const { pageHeight } = pageMetrics();
    const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const hasMeaningfulContent = text.length >= 24 || document.querySelector('img, video, canvas, svg, main, article');
    if (pageHeight < 180 && !hasMeaningfulContent) return true;
    if (document.querySelector('[aria-busy="true"], [data-loading="true"], .loading, .skeleton')) {
      return true;
    }
    return false;
  }

  function screenshotStorageKey(deviceType) {
    return `hm-ss-v5-${normalizePath(location.pathname)}-${deviceType}`;
  }

  function hasScreenshotCaptured(deviceType) {
    try {
      return Boolean(sessionStorage.getItem(screenshotStorageKey(deviceType)));
    } catch (e) {
      return false;
    }
  }

  async function captureScreenshotOnce() {
    if (!SERVER_ORIGIN) return false;

    const ctx = deviceContext();
    const storageKey = screenshotStorageKey(ctx.deviceType);
    if (hasScreenshotCaptured(ctx.deviceType)) return true;

    try {
      await loadScript(SERVER_ORIGIN + '/html2canvas.min.js');
      if (typeof html2canvas !== 'function') return false;

      await waitForPageReady();
      if (isPageLikelyIncomplete()) return false;

      const { pageWidth, pageHeight } = pageMetrics();
      const scale = Math.min(1, 1400 / window.innerWidth);

      const canvas = await captureFullPageSilent(scale);
      let image;
      try {
        image = canvas.toDataURL('image/jpeg', 0.72);
      } catch (e) {
        return false;
      }

      const res = await fetch(SERVER_ORIGIN + '/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: normalizePath(location.pathname),
          viewportWidth: ctx.viewportWidth,
          viewportHeight: ctx.viewportHeight,
          pageWidth,
          pageHeight,
          deviceType: ctx.deviceType,
          image,
        }),
      });

      if (!res.ok) return false;

      try {
        sessionStorage.setItem(storageKey, '1');
      } catch (e) {
        /* noop */
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async function captureScreenshotWithRetries() {
    if (!SERVER_ORIGIN) return;
    if (hasScreenshotCaptured(deviceContext().deviceType)) return;

    for (let attempt = 0; attempt < SCREENSHOT_MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, SCREENSHOT_RETRY_MS[attempt - 1] ?? 10000));
        if (hasScreenshotCaptured(deviceContext().deviceType)) return;
      }

      if (await captureScreenshotOnce()) return;
    }
  }

  function scheduleScreenshot() {
    if (!SERVER_ORIGIN) return;
    const gen = ++screenshotScheduleGen;
    const run = () => {
      if (gen !== screenshotScheduleGen) return;
      setTimeout(() => {
        if (gen !== screenshotScheduleGen) return;
        captureScreenshotWithRetries();
      }, 500);
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, { timeout: 4000 });
    } else {
      run();
    }
  }

  function refreshHeatmapApi() {
    window.__heatmap = {
      ...(window.__heatmap || {}),
      getVariant(experimentId) {
        const id = Number(experimentId);
        const found = abAssignments.find((a) => a.experimentId === id);
        if (found) return found.variant;
        return abAssignments[0]?.variant ?? null;
      },
      getExperiment() {
        return abAssignments[0] ?? null;
      },
      experiments: abAssignments,
      /** SPA 등에서 렌더 완료 후 호출하면 스크린샷 캡처를 다시 시도합니다. */
      notifyPageReady() {
        scheduleScreenshot();
      },
      /** 수동으로 스크린샷 캡처를 시도합니다 (성공 시 sessionStorage에 기록). */
      captureScreenshot() {
        return captureScreenshotWithRetries();
      },
    };
  }

  refreshHeatmapApi();

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
