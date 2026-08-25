import { useState, useRef, useEffect } from 'react';

// 7월 네이트 뉴스 상단 메뉴 클릭 데이터
const RAW_DATA = [
  { menu: '최신뉴스', clicks: 199621 },
  { menu: '랭킹뉴스', clicks: 172417 },
  { menu: '사회',     clicks: 79915  },
  { menu: '경제',     clicks: 75601  },
  { menu: '정치',     clicks: 56131  },
  { menu: '종합',     clicks: 43020  },
  { menu: '세계',     clicks: 40585  },
  { menu: 'IT/과학',  clicks: 23896  },
  { menu: '포토',     clicks: 5065   },
  { menu: '칼럼',     clicks: 5865   },
  { menu: '투데이댓글', clicks: 3854 },
  { menu: 'TV',       clicks: 3741   },
  { menu: '라디오',   clicks: 0      },
];

// 실제 네이트 뉴스 상단 메뉴 순서 & 대략적 위치 (px, 1000px 기준 레이아웃)
const MENU_LAYOUT = [
  { menu: '홈',       x: 38,  w: 30  },
  { menu: '최신뉴스', x: 80,  w: 62  },
  { menu: '정치',     x: 155, w: 40  },
  { menu: '경제',     x: 207, w: 40  },
  { menu: '사회',     x: 259, w: 40  },
  { menu: '세계',     x: 310, w: 40  },
  { menu: 'IT/과학',  x: 362, w: 55  },
  { menu: '칼럼',     x: 430, w: 38  },
  { menu: '포토',     x: 480, w: 38  },
  { menu: 'TV',       x: 530, w: 24  },
  { menu: '라디오',   x: 566, w: 46  },
  { menu: '랭킹뉴스', x: 626, w: 58  },
  { menu: '투데이댓글', x: 697, w: 70 },
];

const max = Math.max(...RAW_DATA.map((d) => d.clicks));

function heatColor(t) {
  // cold→hot: 파랑→청록→초록→노랑→주황→빨강
  const stops = [
    [0.00, [200, 220, 255]],
    [0.25, [0,   190, 255]],
    [0.50, [0,   210, 0  ]],
    [0.70, [255, 210, 0  ]],
    [0.85, [255, 90,  0  ]],
    [1.00, [255, 0,   0  ]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      const r = Math.round(c0[0] + f * (c1[0] - c0[0]));
      const g = Math.round(c0[1] + f * (c1[1] - c0[1]));
      const b = Math.round(c0[2] + f * (c1[2] - c0[2]));
      return `rgb(${r},${g},${b})`;
    }
  }
  return 'rgb(255,0,0)';
}

function getClicks(menu) {
  return RAW_DATA.find((d) => d.menu === menu)?.clicks ?? 0;
}

function formatNum(n) {
  return n.toLocaleString();
}

// ── 메뉴 히트맵 캔버스 ──────────────────────────────────────────
function MenuHeatmapCanvas() {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const CANVAS_W = 780;
  const CANVAS_H = 44;
  const MENU_Y   = 8;
  const MENU_H   = 28;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // 배경
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 구분선
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H - 1);
    ctx.lineTo(CANVAS_W, CANVAS_H - 1);
    ctx.stroke();

    for (const item of MENU_LAYOUT) {
      const clicks = getClicks(item.menu);
      const t = max > 0 ? clicks / max : 0;
      const alpha = clicks > 0 ? Math.max(0.15, t * 0.85) : 0;
      const color = clicks > 0 ? heatColor(t) : null;

      // 히트맵 박스
      if (color) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(item.x, MENU_Y, item.w, MENU_H, 4);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // 메뉴 텍스트
      ctx.font = clicks > 0 && t > 0.3 ? 'bold 12px sans-serif' : '12px sans-serif';
      ctx.fillStyle = t > 0.6 ? '#fff' : '#333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.menu, item.x + item.w / 2, MENU_Y + MENU_H / 2);
    }
  }, []);

  function handleMouseMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);

    for (const item of MENU_LAYOUT) {
      if (mx >= item.x && mx <= item.x + item.w && my >= MENU_Y && my <= MENU_Y + MENU_H) {
        const clicks = getClicks(item.menu);
        const pct = max > 0 ? ((clicks / max) * 100).toFixed(1) : 0;
        setTooltip({ menu: item.menu, clicks, pct, x: e.clientX, y: e.clientY });
        return;
      }
    }
    setTooltip(null);
  }

  return (
    <div className="position-relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ width: '100%', height: 'auto', cursor: 'crosshair', border: '1px solid #e5e7eb', borderRadius: 6 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10,
          background: 'rgba(0,0,0,0.85)', color: '#fff',
          padding: '6px 10px', borderRadius: 6, fontSize: 13, zIndex: 9999,
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          <strong>{tooltip.menu}</strong><br />
          클릭: {formatNum(tooltip.clicks)}<br />
          최대 대비: {tooltip.pct}%
        </div>
      )}
    </div>
  );
}

// ── 막대 차트 ────────────────────────────────────────────────────
function BarChart({ data }) {
  const sorted = [...data].filter(d => d.clicks > 0).sort((a, b) => b.clicks - a.clicks);
  const chartMax = sorted[0]?.clicks || 1;

  return (
    <div className="ext-bar-chart">
      {sorted.map((d) => {
        const t = d.clicks / max;
        const pct = (d.clicks / chartMax) * 100;
        return (
          <div key={d.menu} className="ext-bar-row">
            <div className="ext-bar-label">{d.menu}</div>
            <div className="ext-bar-track">
              <div
                className="ext-bar-fill"
                style={{ width: `${pct}%`, background: heatColor(t) }}
              />
            </div>
            <div className="ext-bar-value">{formatNum(d.clicks)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── 컬러 범례 ─────────────────────────────────────────────────────
function ColorLegend() {
  const steps = 20;
  return (
    <div className="d-flex align-items-center gap-2 mt-2 mb-3">
      <span style={{ fontSize: 11, color: 'var(--bs-secondary)' }}>낮음</span>
      <div style={{
        flex: 1, height: 10, borderRadius: 5,
        background: `linear-gradient(to right, ${
          Array.from({ length: steps }, (_, i) => heatColor(i / (steps - 1))).join(', ')
        })`,
      }} />
      <span style={{ fontSize: 11, color: 'var(--bs-secondary)' }}>높음</span>
    </div>
  );
}

// ── 메인 패널 ────────────────────────────────────────────────────
export default function ExternalHeatmapPanel() {
  return (
    <div className="ext-heatmap-panel">
      <div className="mb-3">
        <h5 className="mb-1">네이트 뉴스 PC — 상단 메뉴 클릭 히트맵</h5>
        <span className="text-muted" style={{ fontSize: 13 }}>2026년 7월 · 외부 클릭통계 데이터</span>
      </div>

      {/* 메뉴 히트맵 */}
      <div className="card mb-4 p-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <strong style={{ fontSize: 14 }}>메뉴바 히트맵</strong>
          <span className="badge bg-secondary">실제 메뉴 레이아웃 기준</span>
        </div>

        {/* 실제 뉴스 사이트 상단 모킹 */}
        <div style={{
          background: '#f8f9fa', borderRadius: 8, padding: '8px 12px',
          marginBottom: 8, fontSize: 12, color: '#888',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#e00', fontWeight: 'bold', fontSize: 16 }}>nate</span>
          <span style={{ fontWeight: 'bold' }}>뉴스</span>
          <span style={{ marginLeft: 'auto' }}>스포츠 연예 판 날씨</span>
        </div>

        <MenuHeatmapCanvas />
        <ColorLegend />

        <div className="row g-2 mt-1">
          {RAW_DATA.filter(d => d.clicks > 0).sort((a,b) => b.clicks - a.clicks).slice(0,3).map((d, i) => (
            <div key={d.menu} className="col-4">
              <div className="text-center p-2 rounded" style={{
                background: heatColor(d.clicks / max),
                color: d.clicks / max > 0.5 ? '#fff' : '#333',
              }}>
                <div style={{ fontSize: 11 }}>#{i+1}</div>
                <div style={{ fontWeight: 'bold', fontSize: 14 }}>{d.menu}</div>
                <div style={{ fontSize: 12 }}>{formatNum(d.clicks)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 막대 차트 */}
      <div className="card p-3">
        <strong style={{ fontSize: 14 }} className="d-block mb-3">메뉴별 클릭 수 (7월 합계)</strong>
        <BarChart data={RAW_DATA} />
      </div>
    </div>
  );
}
