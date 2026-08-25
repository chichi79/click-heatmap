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

const maxClicks = Math.max(...RAW_DATA.map(d => d.clicks));

function getClicks(menu) {
  return RAW_DATA.find(d => d.menu === menu)?.clicks ?? 0;
}

function formatNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '만';
  return n.toLocaleString();
}

/* ── 히트 컬러 ────────────────────────────────────────────────── */
function heatRgba(t, a = 1) {
  const stops = [
    [0.00, [30,  120, 255]],
    [0.25, [0,   200, 255]],
    [0.50, [0,   210, 60 ]],
    [0.70, [255, 210, 0  ]],
    [0.85, [255, 100, 0  ]],
    [1.00, [255, 0,   0  ]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return `rgba(${Math.round(c0[0]+f*(c1[0]-c0[0]))},${Math.round(c0[1]+f*(c1[1]-c0[1]))},${Math.round(c0[2]+f*(c1[2]-c0[2]))},${a})`;
    }
  }
  return `rgba(255,0,0,${a})`;
}

/* ── 네이트 뉴스 레이아웃 상수 (실제 스크린샷 992px 기준) ───── */
const CW = 992;   // 실제 스크린샷 너비

// 메뉴 아이템 X 좌표: 픽셀 분석으로 측정
// 홈 빨간 밑줄 x=20-30, y=155-167 기준으로 나머지 추정
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

// Y 좌표: 픽셀 측정값
const MENU_Y = 128;   // 메뉴바 시작 y
const MENU_H = 44;    // 메뉴바 높이 (홈 밑줄 y=155-167 포함)
const CH     = 300;   // 캔버스 표시 높이 (메뉴 위 로고 포함)

// 레거시 캔버스 모킹용 상수
const TOPNAV_H  = 0;
const LOGO_Y    = 0;
const LOGO_H    = MENU_Y;
const BANNER_Y  = MENU_Y + MENU_H;
const BANNER_H  = 0;
const CONTENT_Y = BANNER_Y;
const CONTENT_H = 0;

/* ── 배경 (네이트 뉴스 UI) 그리기 ───────────────────────────── */
function drawPageChrome(ctx) {
  // ① 전체 배경
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, CW, CH);

  // ② 상단 탑바 (회색)
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, CW, TOPNAV_H);
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, TOPNAV_H); ctx.lineTo(CW, TOPNAV_H); ctx.stroke();
  ctx.font = '11px sans-serif'; ctx.fillStyle = '#888';
  ctx.textBaseline = 'middle';
  ctx.fillText('네이트 메인가기', 10, TOPNAV_H / 2);
  ctx.textAlign = 'right';
  ctx.fillText('뉴스  판  TV  특톡  만화  게임  쇼핑  더보기', CW - 10, TOPNAV_H / 2);
  ctx.textAlign = 'left';

  // ③ 로고 영역
  // nate (빨강)
  ctx.font = 'bold 32px Georgia, serif';
  ctx.fillStyle = '#dd0000';
  ctx.textBaseline = 'middle';
  ctx.fillText('nate', 20, LOGO_Y + LOGO_H / 2);
  // 뉴스 (검정)
  ctx.font = 'bold 22px "Malgun Gothic", sans-serif';
  ctx.fillStyle = '#111';
  ctx.fillText(' 뉴스', 86, LOGO_Y + LOGO_H / 2);

  // 검색창
  const SX = 200, SW = 340, SY = LOGO_Y + 18, SH = 36;
  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(SX, SY, SW, SH);
  // 검색 아이콘
  ctx.fillStyle = '#cc0000';
  ctx.font = '18px sans-serif';
  ctx.fillText('🔍', SX + SW - 26, SY + SH / 2);

  // 우측 링크
  ctx.font = '13px "Malgun Gothic", sans-serif';
  ctx.fillStyle = '#444';
  ctx.textAlign = 'right';
  ctx.fillText('스포츠  연예  판  날씨', CW - 16, LOGO_Y + LOGO_H / 2);
  ctx.textAlign = 'left';

  // ④ 로고-메뉴 구분선
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, MENU_Y - 1); ctx.lineTo(CW, MENU_Y - 1); ctx.stroke();

  // ⑤ 메뉴 바 배경
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, MENU_Y, CW, MENU_H);

  // ⑥ 메뉴 하단 구분선
  ctx.strokeStyle = '#e5e5e5';
  ctx.beginPath(); ctx.moveTo(0, MENU_Y + MENU_H); ctx.lineTo(CW, MENU_Y + MENU_H); ctx.stroke();

  // ⑦ 광고 배너 플레이스홀더
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, BANNER_Y, CW, BANNER_H);
  ctx.strokeStyle = '#efefef';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, BANNER_Y, CW, BANNER_H);
  ctx.fillStyle = '#bbb';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('광고', CW / 2, BANNER_Y + BANNER_H / 2);
  ctx.textAlign = 'left';

  // ⑧ 뉴스 콘텐츠 플레이스홀더 (단순한 선들로 기사 레이아웃 암시)
  const drawArticleLines = (x, y, w) => {
    ctx.fillStyle = '#eee';
    ctx.fillRect(x, y, w * 0.7, 16);
    ctx.fillRect(x, y + 24, w * 0.85, 13);
    ctx.fillRect(x, y + 44, w * 0.6, 11);
    ctx.fillRect(x, y + 62, w * 0.4, 11);
  };
  // 좌측 메인 기사 블록 (이미지+텍스트)
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(20, CONTENT_Y + 20, 200, 140); // 이미지 자리
  drawArticleLines(240, CONTENT_Y + 20, 360);
  // 우측 서브 기사들
  drawArticleLines(640, CONTENT_Y + 20,  320);
  ctx.strokeStyle = '#eee'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(640, CONTENT_Y + 80); ctx.lineTo(960, CONTENT_Y + 80); ctx.stroke();
  drawArticleLines(640, CONTENT_Y + 95,  320);
  ctx.beginPath(); ctx.moveTo(640, CONTENT_Y + 155); ctx.lineTo(960, CONTENT_Y + 155); ctx.stroke();
  drawArticleLines(640, CONTENT_Y + 170, 320);
  // 하단 썸네일 4개
  for (let i = 0; i < 4; i++) {
    const tx = 20 + i * 240, ty = CONTENT_Y + 178;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(tx, ty, 220, 65);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(tx, ty + 72, 220, 11);
    ctx.fillRect(tx, ty + 90, 160, 11);
  }
}

/* ── 히트맵 가우시안 레이어 그리기 ──────────────────────────── */
function drawHeatLayer(ctx) {
  const MY = MENU_Y, MH = MENU_H;
  // Float32 그리드 (메뉴 바 전체 너비 × 높이)
  const grid = new Float32Array(CW * MH);

  for (const m of MENUS) {
    const clicks = getClicks(m.label);
    if (!clicks) continue;
    const t = clicks / maxClicks;
    const r  = Math.round(14 + t * 30);
    const cx = Math.round(m.x + m.w / 2);
    const cy = Math.round(MH / 2);
    const s2 = 2 * (r / 3) * (r / 3);
    for (let py = Math.max(0, cy-r); py <= Math.min(MH-1, cy+r); py++) {
      for (let px = Math.max(0, cx-r); px <= Math.min(CW-1, cx+r); px++) {
        const d2 = (px-cx)**2 + (py-cy)**2;
        if (d2 > r*r) continue;
        grid[py * CW + px] += clicks * Math.exp(-d2 / s2);
      }
    }
  }

  let maxVal = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i] > maxVal) maxVal = grid[i];
  if (!maxVal) return;

  const imgData = ctx.createImageData(CW, MH);
  const data = imgData.data;
  const THRESH = 0.035;
  const hStops = [
    [0.00, [30,  120, 255, 55 ]],
    [0.25, [0,   200, 255, 120]],
    [0.50, [0,   210, 60,  175]],
    [0.70, [255, 210, 0,   210]],
    [0.85, [255, 100, 0,   235]],
    [1.00, [255, 0,   0,   255]],
  ];

  for (let iy = 0; iy < MH; iy++) {
    for (let ix = 0; ix < CW; ix++) {
      const raw = grid[iy * CW + ix] / maxVal;
      if (raw < THRESH) continue;
      const t = (raw - THRESH) / (1 - THRESH);
      let cr=255,cg=0,cb=0,ca=255;
      for (let s = 0; s < hStops.length-1; s++) {
        const [t0,c0]= hStops[s], [t1,c1]= hStops[s+1];
        if (t <= t1) {
          const f=(t-t0)/(t1-t0);
          cr=Math.round(c0[0]+f*(c1[0]-c0[0]));
          cg=Math.round(c0[1]+f*(c1[1]-c0[1]));
          cb=Math.round(c0[2]+f*(c1[2]-c0[2]));
          ca=Math.round(c0[3]+f*(c1[3]-c0[3]));
          break;
        }
      }
      const idx=(iy*CW+ix)*4;
      data[idx]=cr; data[idx+1]=cg; data[idx+2]=cb; data[idx+3]=ca;
    }
  }
  ctx.putImageData(imgData, 0, MY);
}

/* ── 메뉴 텍스트 + 빨간 언더라인(홈) 오버레이 ───────────────── */
function drawMenuLabels(ctx) {
  const MY = MENU_Y, MH = MENU_H;
  for (const m of MENUS) {
    const clicks = getClicks(m.label);
    const t = maxClicks > 0 ? clicks / maxClicks : 0;
    const cx = m.x + m.w / 2;
    const cy = MY + MH / 2;

    // 홈 = 빨간 언더라인
    if (m.label === '홈') {
      ctx.fillStyle = '#dd0000';
      ctx.fillRect(m.x, MY + MH - 3, m.w, 3);
    }

    ctx.font = t > 0.35 ? 'bold 13px "Malgun Gothic",sans-serif' : '13px "Malgun Gothic",sans-serif';
    ctx.fillStyle = t > 0.6 ? '#fff' : '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.label, cx, cy - (clicks > 0 ? 6 : 0));

    // 클릭수 소형 숫자
    if (clicks > 0) {
      ctx.font = '10px "Malgun Gothic",sans-serif';
      ctx.fillStyle = t > 0.6 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.45)';
      ctx.fillText(formatNum(clicks), cx, cy + 8);
    }
  }
  ctx.textAlign = 'left';
}

/* ── 컬러 범례 ────────────────────────────────────────────────── */
function ColorLegend() {
  const steps = 24;
  return (
    <div className="d-flex align-items-center gap-2 mt-3 mb-1">
      <span style={{ fontSize: 11, color: 'var(--bs-secondary)' }}>낮음</span>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: `linear-gradient(to right, ${
          Array.from({ length: steps }, (_, i) => heatRgba(i/(steps-1), 0.85)).join(',')
        })`,
      }} />
      <span style={{ fontSize: 11, color: 'var(--bs-secondary)' }}>높음</span>
    </div>
  );
}

/* ── 메인 캔버스 ──────────────────────────────────────────────── */
function HeatmapCanvas({ bgImage }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  // 스크린샷이 있으면 전체 이미지 높이, 없으면 CH
  const canvasH = bgImage ? bgImage.naturalHeight : CH;
  const canvasW = bgImage ? bgImage.naturalWidth  : CW;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);

    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, canvasW, canvasH);
    } else {
      drawPageChrome(ctx);
    }

    drawHeatLayer(ctx);
    drawMenuLabels(ctx);
  }, [bgImage, canvasW, canvasH]);

  useEffect(() => { draw(); }, [draw]);

  function handleMouseMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasW / rect.width;
    const scaleY = canvasH / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;

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
    <div className="position-relative">
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8, cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x+14, top: tooltip.y-14,
          background: 'rgba(10,10,10,0.9)', color:'#fff',
          padding:'7px 12px', borderRadius:7, fontSize:13,
          zIndex:9999, pointerEvents:'none', whiteSpace:'nowrap', lineHeight:1.7,
          boxShadow:'0 4px 20px rgba(0,0,0,0.35)',
        }}>
          <strong>{tooltip.label}</strong>
          {tooltip.rank && <span style={{marginLeft:6,fontSize:11,opacity:0.65}}>#{tooltip.rank}</span>}
          <br />
          {tooltip.clicks > 0
            ? <>클릭 수: <strong>{tooltip.clicks.toLocaleString()}</strong>회</>
            : <span style={{opacity:0.5}}>데이터 없음</span>}
        </div>
      )}
    </div>
  );
}

const BG_SRC = '/nate-news-bg.png'; // dashboard/public/ 에 저장된 실제 스크린샷

/* ── 메인 패널 ────────────────────────────────────────────────── */
export default function ExternalHeatmapPanel() {
  const [bgImage, setBgImage] = useState(null);
  const sorted = [...RAW_DATA].filter(d=>d.clicks>0).sort((a,b)=>b.clicks-a.clicks);

  // 기본: 번들된 스크린샷 로드
  useEffect(() => {
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.onerror = () => setBgImage(null); // 없으면 캔버스 모킹
    img.src = BG_SRC;
  }, []);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = url;
  }

  return (
    <div className="ext-heatmap-panel">
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-1">네이트 뉴스 PC — 상단 메뉴 클릭 히트맵</h5>
          <span className="text-muted" style={{fontSize:13}}>2026년 7월 합계 · 외부 클릭통계 데이터</span>
        </div>
        <label className="btn btn-sm btn-outline-secondary" style={{cursor:'pointer', whiteSpace:'nowrap'}}>
          📷 배경 이미지 교체
          <input type="file" accept="image/*" style={{display:'none'}} onChange={handleFileChange} />
        </label>
      </div>

      <div className="card p-3 mb-4">
        <HeatmapCanvas bgImage={bgImage} />
        <ColorLegend />
        <p style={{fontSize:12, color:'var(--bs-secondary)', marginBottom:0}}>
          * 메뉴 위에 마우스를 올리면 클릭 수를 확인할 수 있습니다 · 히트맵은 메뉴바 영역에만 표시됩니다
        </p>
      </div>

      {/* 순위 요약 */}
      <div className="card p-4">
        <strong className="d-block mb-3" style={{fontSize:14}}>클릭 순위 (7월)</strong>
        <div className="row g-2">
          {sorted.map((d, i) => {
            const t = d.clicks / maxClicks;
            const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':null;
            return (
              <div key={d.menu} className="col-6 col-md-4 col-lg-3">
                <div style={{
                  padding:'10px 12px', borderRadius:8,
                  background: heatRgba(t, 0.13),
                  border:`1px solid ${heatRgba(t, 0.35)}`,
                  display:'flex', alignItems:'center', gap:8,
                }}>
                  {medal
                    ? <span style={{fontSize:18,lineHeight:1}}>{medal}</span>
                    : <span style={{fontSize:12,color:'#999',width:20,textAlign:'center'}}>#{i+1}</span>
                  }
                  <div>
                    <div style={{fontWeight:'bold',fontSize:13}}>{d.menu}</div>
                    <div style={{fontSize:12,color:'var(--bs-secondary)'}}>{d.clicks.toLocaleString()}회</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
