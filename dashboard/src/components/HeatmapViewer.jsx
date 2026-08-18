import { useEffect, useRef } from 'react';

// cold→hot 컬러 스케일: 파랑→청록→초록→노랑→주황→빨강
// t: 0.0(저밀도) ~ 1.0(고밀도), [r, g, b, a] 반환
function heatColor(t) {
  const stops = [
    [0.00, [0,   0,   255, 110]],
    [0.25, [0,   190, 255, 175]],
    [0.50, [0,   210, 0,   210]],
    [0.70, [255, 210, 0,   230]],
    [0.85, [255, 90,  0,   245]],
    [1.00, [255, 0,   0,   255]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
        Math.round(c0[3] + f * (c1[3] - c0[3])),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

function renderHeatmap(ctx, clicks, width, height, liveMode) {
  ctx.clearRect(0, 0, width, height);
  if (!width || !height || !clicks.length) return;

  // 밀도 연산은 절반 해상도로 수행 (성능): 20k 클릭도 ~60ms 이내
  const SCALE = Math.min(1.0, 500 / Math.max(width, height));
  const gw = Math.max(1, Math.round(width * SCALE));
  const gh = Math.max(1, Math.round(height * SCALE));

  // 픽셀 단위 가우시안 반경 (축소 해상도 기준)
  const radius = liveMode
    ? Math.max(14, Math.min(38, gw * 0.05))
    : Math.max(12, Math.min(32, gw * 0.042));
  const r = Math.ceil(radius);
  const sigma2x2 = 2 * (radius / 3) * (radius / 3);

  // ① Float32Array 밀도 누적 — 절대 포화 없음
  const grid = new Float32Array(gw * gh);

  for (const click of clicks) {
    const xPct = Number(click.x);
    const yPct = Number(click.y);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;

    const cx = Math.round((xPct / 100) * gw);
    const cy = Math.round((yPct / 100) * gh);
    const x0 = Math.max(0, cx - r);
    const x1 = Math.min(gw - 1, cx + r);
    const y0 = Math.max(0, cy - r);
    const y1 = Math.min(gh - 1, cy + r);

    for (let py = y0; py <= y1; py++) {
      const dy2 = (py - cy) * (py - cy);
      for (let px = x0; px <= x1; px++) {
        const d2 = (px - cx) * (px - cx) + dy2;
        if (d2 > r * r) continue;
        grid[py * gw + px] += Math.exp(-d2 / sigma2x2);
      }
    }
  }

  // ② 최댓값으로 정규화 (포화 방지의 핵심)
  let maxVal = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > maxVal) maxVal = grid[i];
  }
  if (maxVal === 0) return;

  // ③ ImageData 채색 — cold→hot 컬러 스케일
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const THRESHOLD = 0.03; // 3% 미만은 투명 처리

  for (let iy = 0; iy < height; iy++) {
    const gy = Math.min(gh - 1, Math.round((iy / height) * gh));
    for (let ix = 0; ix < width; ix++) {
      const gx = Math.min(gw - 1, Math.round((ix / width) * gw));
      const raw = grid[gy * gw + gx] / maxVal;
      if (raw < THRESHOLD) continue;
      const t = (raw - THRESHOLD) / (1 - THRESHOLD); // 임계값 이후 재정규화
      const [cr, cg, cb, ca] = heatColor(t);
      const idx = (iy * width + ix) * 4;
      data[idx]     = cr;
      data[idx + 1] = cg;
      data[idx + 2] = cb;
      data[idx + 3] = ca;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // ④ 클릭 점 표시 — 클릭 수 많으면 크기 줄임
  const dotRadius = liveMode ? 4 : clicks.length > 400 ? 2 : 3;
  const maxDots = liveMode ? clicks.length : Math.min(clicks.length, 2000);

  for (let i = 0; i < maxDots; i++) {
    const click = clicks[i];
    const xPct = Number(click.x);
    const yPct = Number(click.y);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;

    const px = (xPct / 100) * width;
    const py = (yPct / 100) * height;

    ctx.beginPath();
    ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = liveMode ? 'rgba(220, 20, 0, 0.92)' : 'rgba(200, 10, 0, 0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = liveMode ? 1 : 1.2;
    ctx.stroke();
  }
}

export default function HeatmapViewer({ clicks, screenshot, liveMode = false }) {
  const canvasRef = useRef(null);
  const stackRef = useRef(null);
  const prevCountRef = useRef(0);

  const hasScreenshot = Boolean(screenshot?.url);
  const isFullPage = Boolean(screenshot?.pageWidth && screenshot?.pageHeight);

  useEffect(() => {
    if (liveMode && clicks.length > prevCountRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.classList.remove('pulse');
        void canvas.offsetWidth;
        canvas.classList.add('pulse');
      }
    }
    prevCountRef.current = clicks.length;
  }, [clicks.length, liveMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stack = stackRef.current;
    if (!canvas || !stack) return;

    const draw = () => {
      const img = stack.querySelector('img');
      const w = stack.clientWidth;
      if (w < 2) return;

      let h;
      if (img?.complete && img.naturalWidth > 0) {
        h = (img.naturalHeight / img.naturalWidth) * w;
      } else {
        h = stack.clientHeight;
      }
      if (h < 2) return;

      stack.style.height = `${h}px`;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderHeatmap(ctx, clicks, w, h, liveMode);
    };

    draw();
    const t = setTimeout(draw, 150);

    const ro = new ResizeObserver(() => requestAnimationFrame(draw));
    ro.observe(stack);

    const img = stack.querySelector('img');
    if (img) img.addEventListener('load', draw);

    return () => {
      clearTimeout(t);
      ro.disconnect();
      if (img) img.removeEventListener('load', draw);
    };
  }, [clicks, screenshot, liveMode, isFullPage]);

  if (clicks.length === 0 && !hasScreenshot) {
    return (
      <div className="heatmap-viewer">
        <div className="heatmap-empty">선택한 조건에 대한 클릭 데이터가 없습니다</div>
      </div>
    );
  }

  return (
    <div
      className={`heatmap-viewer${hasScreenshot ? ' has-screenshot' : ''}${isFullPage ? ' is-fullpage' : ''}`}
    >
      {isFullPage && (
        <p className="heatmap-scroll-hint">스크롤하여 페이지 전체 히트맵을 확인하세요</p>
      )}
      <div className="heatmap-stack" ref={stackRef}>
        {hasScreenshot ? (
          <img
            className="heatmap-screenshot"
            src={screenshot.url}
            alt="페이지 스크린샷"
          />
        ) : (
          <div className="heatmap-grid-fallback" />
        )}
        <canvas ref={canvasRef} className="heatmap-canvas" />
        {clicks.length === 0 && hasScreenshot && (
          <div className="heatmap-empty overlay">스크린샷은 있으나 클릭 데이터가 없습니다</div>
        )}
        {!hasScreenshot && clicks.length > 0 && (
          <div className="heatmap-no-screenshot">스크린샷 없음 — 그리드 모드</div>
        )}
      </div>
    </div>
  );
}
