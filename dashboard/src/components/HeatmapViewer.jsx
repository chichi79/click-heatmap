import { useEffect, useRef } from 'react';

function renderHeatmap(ctx, clicks, width, height, liveMode) {
  ctx.clearRect(0, 0, width, height);
  if (!width || !height || !clicks.length) return;

  const heatRadius = liveMode
    ? Math.max(18, Math.min(44, width * 0.045))
    : Math.max(16, Math.min(32, width * 0.034));

  const densityFactor = Math.pow(clicks.length / (liveMode ? 40 : 120) + 1, liveMode ? 0.5 : 0.32);
  const centerAlpha = Math.max(
    liveMode ? 0.16 : 0.12,
    (liveMode ? 0.45 : 0.34) / densityFactor
  );

  for (const click of clicks) {
    const x = Number(click.x);
    const y = Number(click.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const px = (x / 100) * width;
    const py = (y / 100) * height;

    const grad = ctx.createRadialGradient(px, py, 0, px, py, heatRadius);
    grad.addColorStop(0, `rgba(255, 35, 0, ${centerAlpha * 0.5})`);
    grad.addColorStop(0.28, `rgba(255, 50, 0, ${centerAlpha})`);
    grad.addColorStop(0.62, `rgba(255, 80, 0, ${centerAlpha * 0.42})`);
    grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(px - heatRadius, py - heatRadius, heatRadius * 2, heatRadius * 2);
  }

  const dotRadius = liveMode ? 4 : clicks.length > 250 ? 2.5 : 3;

  for (const click of clicks) {
    const x = Number(click.x);
    const y = Number(click.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const px = (x / 100) * width;
    const py = (y / 100) * height;

    ctx.beginPath();
    ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = liveMode ? 'rgba(220, 20, 0, 0.9)' : 'rgba(210, 15, 0, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = liveMode ? 1 : 1.25;
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
