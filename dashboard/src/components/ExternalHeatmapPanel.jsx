import { useState, useRef, useEffect, useCallback } from 'react';

/* ── 7월 클릭 데이터 ──────────────────────────────────────────── */
const RAW_DATA = [
  { menu: '최신뉴스',   clicks: 199621 },
  { menu: '랭킹뉴스',   clicks: 172417 },
  { menu: '사회',       clicks: 79915  },
  { menu: '경제',       clicks: 75601  },
  { menu: '정치',       clicks: 56131  },
  { menu: '종합',       clicks: 43020  },
  { menu: '세계',       clicks: 40585  },
  { menu: 'IT/과학',    clicks: 23896  },
  { menu: '칼럼',       clicks: 5865   },
  { menu: '포토',       clicks: 5065   },
  { menu: '투데이댓글', clicks: 3854   },
  { menu: 'TV',         clicks: 3741   },
  { menu: '라디오',     clicks: 0      },
];

const maxClicks  = Math.max(...RAW_DATA.map(d => d.clicks));
const logMax     = Math.log(maxClicks + 1);
const totalClicks = RAW_DATA.reduce((s, d) => s + d.clicks, 0);

// 로그 스케일 정규화 (저클릭도 가시화)
function logT(clicks) {
  if (!clicks) return 0;
  return Math.log(clicks + 1) / logMax;
}

function getClicks(label) {
  return RAW_DATA.find(d => d.menu === label)?.clicks ?? 0;
}

function fmtNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '만';
  if (n >= 1000)  return (n / 1000).toFixed(1).replace(/\.0$/, '') + '천';
  return n.toLocaleString();
}

/* ── 히트 컬러 ────────────────────────────────────────────────── */
function heatRgba(t, a = 1) {
  const stops = [
    [0.00, [80,  160, 255]],
    [0.30, [0,   210, 255]],
    [0.55, [0,   210, 60 ]],
    [0.72, [255, 210, 0  ]],
    [0.87, [255, 100, 0  ]],
    [1.00, [255, 20,  0  ]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return `rgba(${Math.round(c0[0]+f*(c1[0]-c0[0]))},${Math.round(c0[1]+f*(c1[1]-c0[1]))},${Math.round(c0[2]+f*(c1[2]-c0[2]))},${a})`;
    }
  }
  return `rgba(255,20,0,${a})`;
}

/* ── 스크린샷 좌표 ────────────────────────────────────────────── */
const SS_W   = 992;   // 스크린샷 전체 너비
const MENU_Y = 128;   // 메뉴바 시작 Y (픽셀 분석값)
const MENU_H = 44;    // 메뉴바 높이
// 표시할 크롭 영역: 메뉴바 주변만 (로고~메뉴바)
const CROP_Y = 30;    // 위쪽 여백 포함
const CROP_H = 340;   // 표시 높이 (메뉴바 + 하단 콘텐츠 일부 노출)

const MENUS = [
  { label: '홈',         x: 8,   w: 40  },
  { label: '최신뉴스',   x: 55,  w: 78  },
  { label: '정치',       x: 135, w: 52  },
  { label: '경제',       x: 193, w: 52  },
  { label: '사회',       x: 251, w: 52  },
  { label: '세계',       x: 308, w: 52  },
  { label: 'IT/과학',    x: 363, w: 62  },
  { label: '칼럼',       x: 430, w: 50  },
  { label: '포토',       x: 484, w: 50  },
  { label: 'TV',         x: 536, w: 34  },
  { label: '라디오',     x: 571, w: 56  },
  { label: '랭킹뉴스',   x: 629, w: 66  },
  { label: '투데이댓글', x: 698, w: 82  },
];

/* ── 히트맵 오프스크린 렌더링 → 스크린샷 위에 합성 ─────────── */
function buildHeatCanvas(cw, ch, offsetY) {
  // 전체 캔버스 크기로 오프스크린 생성 (잘림 없음)
  const oc  = document.createElement('canvas');
  oc.width  = cw;
  oc.height = ch;
  const ctx  = oc.getContext('2d');
  const grid = new Float32Array(cw * ch);

  // 메뉴바 중심 Y (화면 좌표)
  const menuCY = MENU_Y - offsetY + MENU_H / 2;

  for (const m of MENUS) {
    const clicks = getClicks(m.label);
    if (!clicks) continue;
    const t  = logT(clicks);
    const r  = Math.round(28 + t * 48);   // 반경: 28~76px
    const cx = Math.round(m.x + m.w / 2);
    const cy = Math.round(menuCY);
    const s2 = 2 * (r / 2.0) * (r / 2.0);

    // 그리드 범위는 캔버스 전체 — 잘림 없음
    for (let py = Math.max(0, cy-r); py <= Math.min(ch-1, cy+r); py++) {
      for (let px = Math.max(0, cx-r); px <= Math.min(cw-1, cx+r); px++) {
        const d2 = (px-cx)**2 + (py-cy)**2;
        if (d2 > r*r) continue;
        grid[py*cw+px] += clicks * Math.exp(-d2/s2);
      }
    }
  }

  let maxVal = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i] > maxVal) maxVal = grid[i];
  if (!maxVal) return oc;

  const imgData = ctx.createImageData(cw, ch);
  const data    = imgData.data;
  const THRESH  = 0.006;   // 매우 낮음 → 3천대도 가시화

  // 정통 히트맵 컬러 (파랑→청→초록→노랑→주황→빨강), alpha만 제어
  const cStops = [
    [0.00, [0,   0,   255]],
    [0.25, [0,   220, 255]],
    [0.50, [0,   230, 0  ]],
    [0.70, [255, 230, 0  ]],
    [0.85, [255, 80,  0  ]],
    [1.00, [255, 0,   0  ]],
  ];

  for (let iy = 0; iy < ch; iy++) {
    for (let ix = 0; ix < cw; ix++) {
      const raw = grid[iy*cw+ix] / maxVal;
      if (raw < THRESH) continue;
      const t = Math.pow((raw - THRESH) / (1 - THRESH), 0.5); // 감마 0.5

      // 컬러
      let cr=255, cg=0, cb=0;
      for (let s = 0; s < cStops.length-1; s++) {
        const [t0,c0] = cStops[s], [t1,c1] = cStops[s+1];
        if (t <= t1) {
          const f = (t-t0)/(t1-t0);
          cr = Math.round(c0[0]+f*(c1[0]-c0[0]));
          cg = Math.round(c0[1]+f*(c1[1]-c0[1]));
          cb = Math.round(c0[2]+f*(c1[2]-c0[2]));
          break;
        }
      }
      // 알파: 저밀도 투명 → 고밀도 반투명 (최대 0.72)
      const ca = Math.round(t * 184);  // max alpha = 184/255 ≈ 0.72

      const idx = (iy*cw+ix)*4;
      data[idx]=cr; data[idx+1]=cg; data[idx+2]=cb; data[idx+3]=ca;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return oc;
}

/* ── 히트맵 캔버스 ────────────────────────────────────────────── */
function HeatmapCanvas({ bgImage }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const cw = SS_W;
  const ch = CROP_H;
  const oy = CROP_Y; // crop offset Y

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);

    if (bgImage) {
      // 스크린샷 크롭: CROP_Y ~ CROP_Y+CROP_H 만 표시 (원본 그대로)
      ctx.drawImage(bgImage, 0, oy, cw, ch, 0, 0, cw, ch);
    } else {
      // 폴백: 흰 배경
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#ebebeb';
      ctx.fillRect(0, MENU_Y - oy, cw, MENU_H);
    }

    // 히트맵 오프스크린 합성 (텍스트 오버레이 없음)
    const heatCanvas = buildHeatCanvas(cw, ch, oy);
    ctx.drawImage(heatCanvas, 0, 0);
  }, [bgImage, cw, ch, oy]);

  useEffect(() => { draw(); }, [draw]);

  function handleMouseMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (cw / rect.width);
    const my = (e.clientY - rect.top)  * (ch / rect.height) + oy;
    if (my < MENU_Y || my > MENU_Y + MENU_H) { setTooltip(null); return; }
    for (const m of MENUS) {
      if (mx >= m.x && mx <= m.x + m.w) {
        const clicks = getClicks(m.label);
        const rank = clicks > 0
          ? [...RAW_DATA].filter(d=>d.clicks>0).sort((a,b)=>b.clicks-a.clicks).findIndex(d=>d.menu===m.label)+1
          : null;
        setTooltip({ label: m.label, clicks, rank, x: e.clientX, y: e.clientY });
        return;
      }
    }
    setTooltip(null);
  }

  return (
    <div style={{ position:'relative', borderRadius:8, overflow:'hidden' }}>
      <canvas
        ref={canvasRef}
        width={cw}
        height={ch}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {/* 하단 페이드아웃 */}
      <div style={{
        position:'absolute', left:0, right:0, bottom:0,
        height:'45%',
        background:'linear-gradient(to bottom, transparent 0%, var(--bs-body-bg, #fff) 100%)',
        pointerEvents:'none',
      }}/>
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x+14, top: tooltip.y-12,
          background: 'rgba(15,15,15,0.9)', color:'#fff',
          padding:'6px 11px', borderRadius:6, fontSize:12,
          zIndex:9999, pointerEvents:'none', lineHeight:1.6,
          boxShadow:'0 4px 16px rgba(0,0,0,0.3)',
        }}>
          <span style={{fontWeight:600}}>{tooltip.label}</span>
          {tooltip.rank && <span style={{marginLeft:6,opacity:0.55,fontSize:10}}>#{tooltip.rank}</span>}
          <br/>
          {tooltip.clicks > 0
            ? <>{tooltip.clicks.toLocaleString()} 클릭</>
            : <span style={{opacity:0.45}}>데이터 없음</span>}
        </div>
      )}
    </div>
  );
}

/* ── 우측 데이터 패널 ─────────────────────────────────────────── */
function DataPanel() {
  const sorted = [...RAW_DATA].filter(d => d.clicks > 0).sort((a, b) => b.clicks - a.clicks);
  return (
    <div className="ext-data-panel">
      {sorted.map((d, i) => {
        const t  = logT(d.clicks);
        const pct = (d.clicks / maxClicks * 100).toFixed(1);
        const sharePct = (d.clicks / totalClicks * 100).toFixed(1);
        return (
          <div key={d.menu} className="ext-data-row">
            <div className="ext-data-rank">{i < 3 ? ['🥇','🥈','🥉'][i] : <span>{i+1}</span>}</div>
            <div className="ext-data-name">{d.menu}</div>
            <div className="ext-data-bar-wrap">
              <div
                className="ext-data-bar"
                style={{ width: `${pct}%`, background: heatRgba(t, 0.85) }}
              />
            </div>
            <div className="ext-data-meta">
              <span className="ext-data-clicks">{d.clicks.toLocaleString()}</span>
              <span className="ext-data-share">{sharePct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 컬러 범례 ────────────────────────────────────────────────── */
function Legend() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
      <span style={{ fontSize:10, color:'#999' }}>낮음</span>
      <div style={{
        flex:1, height:6, borderRadius:3,
        background:`linear-gradient(to right,${
          Array.from({length:20},(_,i)=>heatRgba(i/19, 0.8)).join(',')
        })`,
      }}/>
      <span style={{ fontSize:10, color:'#999' }}>높음</span>
      <span style={{ fontSize:10, color:'#bbb', marginLeft:4 }}>로그 스케일</span>
    </div>
  );
}

/* ── 메인 패널 ────────────────────────────────────────────────── */
const BG_SRC = '/nate-news-bg.png';

export default function ExternalHeatmapPanel() {
  const [bgImage, setBgImage] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.onload  = () => setBgImage(img);
    img.onerror = () => setBgImage(null);
    img.src = BG_SRC;
  }, []);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = URL.createObjectURL(file);
  }

  return (
    <div className="ext-heatmap-panel">
      {/* 헤더 */}
      <div className="ext-header">
        <div>
          <div className="ext-title">네이트 뉴스 PC · 상단 메뉴 클릭 히트맵</div>
          <div className="ext-subtitle">2026년 7월 합계 · 총 {totalClicks.toLocaleString()}회 클릭</div>
        </div>
        <label className="ext-upload-btn">
          배경 교체
          <input type="file" accept="image/*" style={{display:'none'}} onChange={handleFileChange}/>
        </label>
      </div>

      {/* 본문: 히트맵 + 데이터 */}
      <div className="ext-body">
        {/* 왼쪽: 히트맵 */}
        <div className="ext-map-col">
          <HeatmapCanvas bgImage={bgImage}/>
          <Legend/>
        </div>
        {/* 오른쪽: 데이터 */}
        <div className="ext-stat-col">
          <div className="ext-stat-head">메뉴별 클릭 순위</div>
          <DataPanel/>
        </div>
      </div>
    </div>
  );
}
