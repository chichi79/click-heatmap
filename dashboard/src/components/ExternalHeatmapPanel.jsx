import { useState, useRef, useEffect, useCallback } from 'react';

/* ── 월별 클릭 데이터 ─────────────────────────────────────────── */
const MONTHLY_DATA = {
  '2026-07': {
    news: {
      pc: {
        snb: [
          { menu: '최신뉴스',   clicks: 199621 },
          { menu: '랭킹뉴스',   clicks: 172417 },
          { menu: '사회',       clicks: 79915  },
          { menu: '경제',       clicks: 75601  },
          { menu: '정치',       clicks: 56131  },
          { menu: '세계',       clicks: 40585  },
          { menu: 'IT/과학',    clicks: 23896  },
          { menu: '칼럼',       clicks: 5865   },
          { menu: '포토',       clicks: 5065   },
          { menu: '투데이댓글', clicks: 3854   },
          { menu: 'TV',         clicks: 3741   },
        ],
        gnb: [
          { menu: '스포츠', clicks: 18961 },
          { menu: '뉴스',   clicks: 5933  },
          { menu: '날씨',   clicks: 3964  },
          { menu: '연예',   clicks: 3359  },
          { menu: '판',     clicks: 2225  },
        ],
      },
      mobile: {
        snb: [],
        gnb: [
          { menu: 'BI',    clicks: 2420658 },
          { menu: '연예',  clicks: 310635  },
          { menu: '스포츠',clicks: 217193  },
          { menu: '뉴스',  clicks: 199673  },
          { menu: '검색',  clicks: 97643   },
        ],
      },
    },
    pan: {
      pc:     { snb: [], gnb: [], top: [] },
      mobile: {
        snb: [
          { menu: '오늘의 톡',    clicks: 125401  },
          { menu: '톡커들의 선택',clicks: 1106739 },
        ],
        gnb: [
          { menu: '톡톡',        clicks: 304983 },
          { menu: '홈',          clicks: 98874  },
          { menu: '기자 PICK 판',clicks: 18293  },
          { menu: '배틀톡',      clicks: 14391  },
          { menu: '팬톡',        clicks: 11336  },
          { menu: '톡톡쓰기',    clicks: 52526  },
        ],
        top: [
          { menu: '판',   clicks: 41891  },
          { menu: 'MY',   clicks: 239015 },
          { menu: '검색', clicks: 529327 },
        ],
        section: [
          { menu: '오늘의판',        clicks: 4791923 },
          { menu: '새로운베플',       clicks: 343814  },
          { menu: '실시간연애상담소', clicks: 127273  },
          { menu: '실시간회사톡',     clicks: 43172   },
        ],
      },
    },
  },
};

const MONTH_LABELS = {
  '2026-07': '2026년 7월',
};

/* ── 페이지별 디바이스 설정 ──────────────────────────────────── */
const PAGE_CONFIG = {
  news: {
    label: '뉴스',
    icon:  'bi-newspaper',
    devices: {
      pc: {
        bgSrc:  '/nate-news-bg.png',
        ssW:    992,
        gnbY:   62,  gnbH: 26,
        menuY:  128, menuH: 44,
        cropY:  30,  cropH: 340,
        gnbMenus: [
          { label: '뉴스',   x: 112, w: 38 },
          { label: '스포츠', x: 158, w: 52 },
          { label: '연예',   x: 218, w: 38 },
          { label: '판',     x: 264, w: 28 },
          { label: '날씨',   x: 300, w: 38 },
        ],
        snbMenus: [
          { label: '최신뉴스',   x: 55,  w: 78 },
          { label: '정치',       x: 135, w: 52 },
          { label: '경제',       x: 193, w: 52 },
          { label: '사회',       x: 251, w: 52 },
          { label: '세계',       x: 308, w: 52 },
          { label: 'IT/과학',    x: 363, w: 62 },
          { label: '칼럼',       x: 430, w: 50 },
          { label: '포토',       x: 484, w: 50 },
          { label: 'TV',         x: 536, w: 34 },
          { label: '랭킹뉴스',   x: 629, w: 66 },
          { label: '투데이댓글', x: 698, w: 82 },
        ],
      },
      mobile: {
        bgSrc:    '/nate-news-mobile-bg.png',
        ssW:      625,
        displayW: 390,
        gnbY:   10,  gnbH: 32,
        menuY:  50,  menuH: 32,
        cropY:  0,   cropH: 761,
        gnbMenus: [
          { label: 'BI',     x: 8,   w: 32 },
          { label: '뉴스',   x: 50,  w: 48 },
          { label: '스포츠', x: 108, w: 64 },
          { label: '연예',   x: 183, w: 46 },
          { label: '검색',   x: 590, w: 30 },
        ],
        snbMenus: [
          { label: '홈',      x: 8,   w: 36 },
          { label: '랭킹뉴스',x: 52,  w: 76 },
          { label: '이슈픽',  x: 136, w: 56 },
          { label: '정치',    x: 200, w: 46 },
          { label: '경제',    x: 253, w: 46 },
          { label: '사회',    x: 306, w: 46 },
          { label: '세계',    x: 359, w: 46 },
          { label: 'IT',      x: 412, w: 24 },
          { label: '포토',    x: 443, w: 46 },
          { label: 'TV',      x: 496, w: 24 },
        ],
      },
    },
  },
  pan: {
    label: '판',
    icon:  'bi-chat-dots',
    devices: {
      pc: {
        bgSrc:  null,  // 추후 추가
        ssW:    992,
        gnbY:   60,  gnbH: 28,
        menuY:  100, menuH: 40,
        cropY:  30,  cropH: 340,
        gnbMenus: [],
        snbMenus: [],
      },
      mobile: {
        ssW: 629, displayW: 390,
        areas: {
          header: {
            bgSrc:  '/nate-pan-mobile-bg.png',
            cropY:  0,  cropH: 838,
            topY:   15, topH:  30,
            gnbY:   60, gnbH:  40,
            menuY:  155, menuH: 35,
            topMenus: [
              { label: '판',    x: 0,   w: 220 },
              { label: 'MY',    x: 548, w: 40  },
              { label: '검색',  x: 588, w: 41  },
            ],
            gnbMenus: [
              { label: '홈',          x: 0,   w: 100 },
              { label: '톡톡',        x: 100, w: 95  },
              { label: '팬톡',        x: 195, w: 95  },
              { label: '배틀톡',      x: 290, w: 120 },
              { label: '기자 PICK 판',x: 410, w: 175 },
              { label: '톡톡쓰기',    x: 600, w: 29  },
            ],
            snbMenus: [
              { label: '오늘의 톡',    x: 0,   w: 130 },
              { label: '톡커들의 선택',x: 160, w: 140 },
              { label: '엔터톡',       x: 320, w: 95  },
              { label: '화제의 톡톡',  x: 430, w: 150 },
            ],
          },
          content: {
            bgSrc:   '/nate-pan-content-bg.png',
            cropY:   0,  cropH: 1650,
            gnbY:    -1, gnbH: 0,   // 없음
            menuY:   -1, menuH: 0,
            gnbMenus: [], snbMenus: [],
            sectionMenus: [
              { label: '오늘의판',        x: 0, w: 629, cy: 10   },
              { label: '새로운베플',       x: 0, w: 629, cy: 480  },
              { label: '실시간연애상담소', x: 0, w: 629, cy: 980  },
              { label: '실시간회사톡',     x: 0, w: 629, cy: 1275 },
            ],
          },
        },
      },
    },
  },
};

/* ── 유틸 ─────────────────────────────────────────────────────── */
function makeHelpers(deviceData) {
  const snb     = deviceData?.snb     ?? [];
  const gnb     = deviceData?.gnb     ?? [];
  const top     = deviceData?.top     ?? [];
  const section = deviceData?.section ?? [];
  const all = [...snb, ...gnb, ...top, ...section];
  const max      = all.length ? Math.max(...all.map(d => d.clicks)) : 1;
  const logMax   = Math.log(max + 1);
  const total    = snb.reduce((s, d) => s + d.clicks, 0);
  const gnbTotal = gnb.reduce((s, d) => s + d.clicks, 0);
  const topTotal = top.reduce((s, d) => s + d.clicks, 0);
  const logT     = (c) => c ? Math.log(c + 1) / logMax : 0;
  const getC     = (label) => all.find(d => d.menu === label)?.clicks ?? 0;
  return { max, total, gnbTotal, topTotal, logT, getC, snb, gnb, top, section };
}

function fmtNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '만';
  if (n >= 1000)  return (n / 1000).toFixed(1).replace(/\.0$/, '') + '천';
  return n.toLocaleString();
}

/* ── 히트 컬러 ────────────────────────────────────────────────── */
function heatRgba(t, a = 1) {
  const stops = [
    [0.00, [0,   30,  255]],
    [0.20, [0,   200, 255]],
    [0.42, [0,   240, 100]],
    [0.62, [200, 240, 0  ]],
    [0.78, [255, 180, 0  ]],
    [0.90, [255, 50,  0  ]],
    [1.00, [255, 0,   30 ]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return `rgba(${Math.round(c0[0]+f*(c1[0]-c0[0]))},${Math.round(c0[1]+f*(c1[1]-c0[1]))},${Math.round(c0[2]+f*(c1[2]-c0[2]))},${a})`;
    }
  }
  return `rgba(255,0,30,${a})`;
}

/* ── 히트맵 오프스크린 빌드 ──────────────────────────────────── */
const HEAT_PAD = 70; // 좌우상하 여백 — 블롭이 잘리지 않도록

function buildHeatCanvas(cw, ch, cfg, helpers) {
  const { logT, getC } = helpers;
  const { gnbY, gnbH, menuY, menuH, gnbMenus, snbMenus, cropY,
          topY, topH, topMenus, sectionMenus } = cfg;
  const tw = cw + HEAT_PAD * 2;
  const th = ch + HEAT_PAD * 2;
  const oc  = document.createElement('canvas');
  oc.width  = tw; oc.height = th;
  const ctx  = oc.getContext('2d');
  const grid = new Float32Array(tw * th);
  // 블롭 Y 중심 (HEAT_PAD 만큼 아래로 이동)
  const snbCY = menuY - cropY + menuH / 2 + HEAT_PAD;
  const gnbCY = gnbY  - cropY + gnbH  / 2 + HEAT_PAD;

  // SECTION 레이어 — 섹션별 독립 그리드로 정규화 (클릭수 차이가 커도 모두 표시)
  const sectionCanvases = [];
  if (sectionMenus?.length) {
    const secClicks = sectionMenus.map(m => ({ m, clicks: getC(m.label) })).filter(x => x.clicks > 0);
    const secMax = secClicks.length ? Math.max(...secClicks.map(x => x.clicks)) : 1;
    const secLogMax = Math.log(secMax + 1);
    for (const { m, clicks } of secClicks) {
      const t   = Math.log(clicks + 1) / secLogMax;  // 섹션 내 상대 스케일
      const r   = Math.round(30 + t * 55);
      const cx  = Math.round(m.x + m.w / 2 + HEAT_PAD);
      const cy  = Math.round(m.cy - cropY + HEAT_PAD);
      const s2  = 2 * (r / 1.6) * (r / 1.6);
      // 이 섹션 전용 그리드
      const sg  = new Float32Array(tw * th);
      for (let py = Math.max(0, cy-r); py <= Math.min(th-1, cy+r); py++) {
        for (let px = Math.max(0, cx-r); px <= Math.min(tw-1, cx+r); px++) {
          const d2 = (px-cx)**2 + (py-cy)**2;
          if (d2 > r*r) continue;
          sg[py*tw+px] += Math.exp(-d2/s2);
        }
      }
      sectionCanvases.push({ sg, t });
    }
  }

  // TOP 레이어 (최상단 유틸 바)
  if (topMenus && topY != null) {
    const topCY = topY - cropY + (topH ?? 30) / 2 + HEAT_PAD;
    for (const m of topMenus) {
      const clicks = getC(m.label);
      if (!clicks) continue;
      const t  = logT(clicks);
      const r  = Math.round(18 + t * 30);
      const cx = Math.round(m.x + m.w / 2 + HEAT_PAD);
      const cy = Math.round(topCY);
      const s2 = 2 * (r / 1.8) * (r / 1.8);
      for (let py = Math.max(0, cy-r); py <= Math.min(th-1, cy+r); py++) {
        for (let px = Math.max(0, cx-r); px <= Math.min(tw-1, cx+r); px++) {
          const d2 = (px-cx)**2 + (py-cy)**2;
          if (d2 > r*r) continue;
          grid[py*tw+px] += clicks * Math.exp(-d2/s2);
        }
      }
    }
  }

  // SNB 레이어
  for (const m of snbMenus) {
    const clicks = getC(m.label);
    if (!clicks) continue;
    const t  = logT(clicks);
    const r  = Math.round(32 + t * 52);
    const cx = Math.round(m.x + m.w / 2 + HEAT_PAD);
    const cy = Math.round(snbCY);
    const s2 = 2 * (r / 1.8) * (r / 1.8);
    for (let py = Math.max(0, cy-r); py <= Math.min(th-1, cy+r); py++) {
      for (let px = Math.max(0, cx-r); px <= Math.min(tw-1, cx+r); px++) {
        const d2 = (px-cx)**2 + (py-cy)**2;
        if (d2 > r*r) continue;
        grid[py*tw+px] += clicks * Math.exp(-d2/s2);
      }
    }
  }

  // GNB 레이어
  for (const m of gnbMenus) {
    const clicks = getC(m.label);
    if (!clicks) continue;
    const t  = logT(clicks);
    const r  = Math.round(22 + t * 36);
    const cx = Math.round(m.x + m.w / 2 + HEAT_PAD);
    const cy = Math.round(gnbCY);
    const s2 = 2 * (r / 1.8) * (r / 1.8);
    for (let py = Math.max(0, cy-r); py <= Math.min(th-1, cy+r); py++) {
      for (let px = Math.max(0, cx-r); px <= Math.min(tw-1, cx+r); px++) {
        const d2 = (px-cx)**2 + (py-cy)**2;
        if (d2 > r*r) continue;
        grid[py*tw+px] += clicks * Math.exp(-d2/s2);
      }
    }
  }

  let maxVal = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i] > maxVal) maxVal = grid[i];
  if (!maxVal) return oc;

  // 박스 블러
  const blurred = new Float32Array(tw * th);
  const BR = 4;
  for (let iy = 0; iy < th; iy++) {
    for (let ix = 0; ix < tw; ix++) {
      let sum = 0, cnt = 0;
      for (let dy = -BR; dy <= BR; dy++) {
        const py = iy+dy; if (py<0||py>=th) continue;
        for (let dx = -BR; dx <= BR; dx++) {
          const px = ix+dx; if (px<0||px>=tw) continue;
          sum += grid[py*tw+px]; cnt++;
        }
      }
      blurred[iy*tw+ix] = sum / cnt;
    }
  }

  const imgData = ctx.createImageData(tw, th);
  const data    = imgData.data;
  const THRESH  = 0.004;
  const cStops  = [
    [0.00, [0,   30,  255]],
    [0.20, [0,   200, 255]],
    [0.42, [0,   240, 100]],
    [0.62, [200, 240, 0  ]],
    [0.78, [255, 180, 0  ]],
    [0.90, [255, 50,  0  ]],
    [1.00, [255, 0,   30 ]],
  ];
  for (let iy = 0; iy < th; iy++) {
    for (let ix = 0; ix < tw; ix++) {
      const raw = blurred[iy*tw+ix] / maxVal;
      if (raw < THRESH) continue;
      const t = Math.pow((raw - THRESH) / (1 - THRESH), 0.45);
      let cr=255, cg=0, cb=30;
      for (let s = 0; s < cStops.length-1; s++) {
        const [t0,c0] = cStops[s], [t1,c1] = cStops[s+1];
        if (t <= t1) {
          const f=(t-t0)/(t1-t0);
          cr=Math.round(c0[0]+f*(c1[0]-c0[0]));
          cg=Math.round(c0[1]+f*(c1[1]-c0[1]));
          cb=Math.round(c0[2]+f*(c1[2]-c0[2]));
          break;
        }
      }
      const ca = Math.round(t*t*(3-2*t)*200);
      const idx = (iy*tw+ix)*4;
      data[idx]=cr; data[idx+1]=cg; data[idx+2]=cb; data[idx+3]=ca;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // 섹션 캔버스 합성 (독립 정규화)
  for (const { sg, t } of sectionCanvases) {
    let sgMax = 0;
    for (let i = 0; i < sg.length; i++) if (sg[i] > sgMax) sgMax = sg[i];
    if (!sgMax) continue;
    const sgImg = ctx.createImageData(tw, th);
    const sd = sgImg.data;
    for (let i = 0; i < tw * th; i++) {
      const raw = sg[i] / sgMax;
      if (raw < 0.02) continue;
      const tv = Math.pow(raw, 0.5) * t;
      let cr=255,cg=0,cb=30;
      for (let s = 0; s < cStops.length-1; s++) {
        const [t0,c0]=cStops[s],[t1,c1]=cStops[s+1];
        if (tv<=t1){const f=(tv-t0)/(t1-t0);cr=Math.round(c0[0]+f*(c1[0]-c0[0]));cg=Math.round(c0[1]+f*(c1[1]-c0[1]));cb=Math.round(c0[2]+f*(c1[2]-c0[2]));break;}
      }
      const ca = Math.round(raw * tv * (3 - 2*raw) * 190);
      const idx = i*4;
      sd[idx]=cr; sd[idx+1]=cg; sd[idx+2]=cb; sd[idx+3]=ca;
    }
    ctx.putImageData(sgImg, 0, 0);
  }

  const out = document.createElement('canvas');
  out.width=tw; out.height=th;
  const octx = out.getContext('2d');
  octx.filter = 'blur(3px)';
  octx.drawImage(oc, 0, 0);
  return out;
}

/* ── 히트맵 캔버스 컴포넌트 ──────────────────────────────────── */
function HeatmapCanvas({ bgImage, helpers, cfg, ssW: ssWProp }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const ssW = ssWProp ?? cfg.ssW ?? 629;
  const { cropY, cropH, gnbY, gnbH, menuY, menuH, gnbMenus, snbMenus,
          topY, topH, topMenus, sectionMenus } = cfg;
  const cw = ssW, ch = cropH, oy = cropY;
  // 패딩 포함 캔버스 크기
  const tw = cw + HEAT_PAD * 2;
  const th = ch + HEAT_PAD * 2;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, tw, th);
    if (bgImage) {
      // 배경 이미지는 PAD만큼 오프셋하여 중앙에
      ctx.drawImage(bgImage, 0, oy, cw, ch, HEAT_PAD, HEAT_PAD, cw, ch);
    } else {
      ctx.fillStyle = '#f8f8f8'; ctx.fillRect(0, 0, tw, th);
      ctx.fillStyle = '#ebebeb'; ctx.fillRect(HEAT_PAD, menuY-oy+HEAT_PAD, cw, menuH);
      ctx.fillStyle = '#f0f0f0'; ctx.fillRect(HEAT_PAD, gnbY-oy+HEAT_PAD, cw, gnbH);
    }
    ctx.drawImage(buildHeatCanvas(cw, ch, cfg, helpers), 0, 0);
  }, [bgImage, helpers, cfg, cw, ch, oy, tw, th]);

  useEffect(() => { draw(); }, [draw]);

  function handleMouseMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    // PAD를 제거해 실제 스크린샷 좌표로 변환
    const mx = (e.clientX - rect.left) * (tw / rect.width) - HEAT_PAD;
    const my = (e.clientY - rect.top)  * (th / rect.height) - HEAT_PAD + oy;
    // SECTION
    if (sectionMenus) {
      for (const m of sectionMenus) {
        const sH = 30;
        if (my >= m.cy - sH/2 && my <= m.cy + sH/2 && mx >= m.x && mx <= m.x + m.w) {
          setTooltip({ label: m.label, clicks: helpers.getC(m.label), tag: '섹션', x: e.clientX, y: e.clientY });
          return;
        }
      }
    }
    // TOP 유틸 바
    if (topMenus && topY != null && my >= topY && my <= topY + (topH ?? 30)) {
      for (const m of topMenus) {
        if (mx >= m.x && mx <= m.x + m.w) {
          setTooltip({ label: m.label, clicks: helpers.getC(m.label), tag: 'TOP', x: e.clientX, y: e.clientY });
          return;
        }
      }
    }
    // GNB
    if (my >= gnbY && my <= gnbY + gnbH) {
      for (const m of gnbMenus) {
        if (mx >= m.x && mx <= m.x + m.w) {
          setTooltip({ label: m.label, clicks: helpers.getC(m.label), tag: 'GNB', x: e.clientX, y: e.clientY });
          return;
        }
      }
    }
    // SNB
    if (my >= menuY && my <= menuY + menuH) {
      for (const m of snbMenus) {
        if (mx >= m.x && mx <= m.x + m.w) {
          setTooltip({ label: m.label, clicks: helpers.getC(m.label), tag: 'SNB', x: e.clientX, y: e.clientY });
          return;
        }
      }
    }
    setTooltip(null);
  }

  return (
    <div style={{ position:'relative', borderRadius:8, overflow:'hidden', display:'inline-block', maxWidth:'100%' }}>
      <canvas
        ref={canvasRef} width={tw} height={th}
        style={{ display:'block', cursor:'crosshair', maxWidth:'100%', height:'auto' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      <div style={{
        position:'absolute', left:0, right:0, bottom:0, height:'40%',
        background:'linear-gradient(to bottom, transparent 0%, var(--bs-body-bg,#fff) 100%)',
        pointerEvents:'none',
      }}/>
      {tooltip && (
        <div style={{
          position:'fixed', left:tooltip.x+14, top:tooltip.y-12,
          background:'rgba(15,15,15,0.9)', color:'#fff',
          padding:'6px 11px', borderRadius:6, fontSize:12,
          zIndex:9999, pointerEvents:'none', lineHeight:1.6,
          boxShadow:'0 4px 16px rgba(0,0,0,0.3)',
        }}>
          <span style={{fontSize:9,opacity:0.5,marginRight:4}}>{tooltip.tag}</span>
          <span style={{fontWeight:600}}>{tooltip.label}</span><br/>
          {tooltip.clicks > 0
            ? <>{tooltip.clicks.toLocaleString()} 클릭</>
            : <span style={{opacity:0.4}}>데이터 없음</span>}
        </div>
      )}
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
      <span style={{ fontSize:10, color:'#ccc', marginLeft:4 }}>로그 스케일</span>
    </div>
  );
}

/* ── 데이터 패널 ──────────────────────────────────────────────── */
function DataSection({ items, total, helpers, label }) {
  const { max, logT } = helpers;
  const sorted = [...items].filter(d => d.clicks > 0).sort((a, b) => b.clicks - a.clicks);
  if (!sorted.length) return null;
  return (
    <>
      <div className="ext-section-label">{label}</div>
      {sorted.map((d, i) => {
        const t    = logT(d.clicks);
        const pct  = (d.clicks / max * 100).toFixed(1);
        const share= total > 0 ? (d.clicks / total * 100).toFixed(1) : '—';
        return (
          <div key={d.menu} className="ext-data-row">
            <div className="ext-data-rank">
              {i < 3 ? ['🥇','🥈','🥉'][i] : <span>{i+1}</span>}
            </div>
            <div className="ext-data-top">
              <div className="ext-data-name">{d.menu}</div>
              <div className="ext-data-meta">
                <span className="ext-data-clicks">{d.clicks.toLocaleString()}</span>
                <span className="ext-data-share">{share}%</span>
              </div>
            </div>
            <div className="ext-data-bar-wrap">
              <div className="ext-data-bar" style={{ width:`${pct}%`, background:heatRgba(t, 0.85) }}/>
            </div>
          </div>
        );
      })}
    </>
  );
}

function DataPanel({ helpers, area }) {
  const { snb, gnb, top, section } = helpers;
  const { max, logT } = helpers;

  // area가 있으면 해당 영역만 표시, 없으면 전체
  const allItems = area === 'content'
    ? section.map(d => ({ ...d, tag: 'SEC' }))
    : area === 'header'
      ? [
          ...top.map(d     => ({ ...d, tag: 'TOP' })),
          ...gnb.map(d     => ({ ...d, tag: 'GNB' })),
          ...snb.map(d     => ({ ...d, tag: 'SNB' })),
        ]
      : [
          ...section.map(d => ({ ...d, tag: 'SEC' })),
          ...top.map(d     => ({ ...d, tag: 'TOP' })),
          ...gnb.map(d     => ({ ...d, tag: 'GNB' })),
          ...snb.map(d     => ({ ...d, tag: 'SNB' })),
        ];

  const filtered = allItems.filter(d => d.clicks > 0).sort((a, b) => b.clicks - a.clicks);

  const grandTotal = filtered.reduce((s, d) => s + d.clicks, 0);

  const tagColor = { SEC: '#dc3545', TOP: '#6f42c1', GNB: '#0d6efd', SNB: '#198754' };

  if (!filtered.length) return null;
  return (
    <div className="ext-data-panel">
      {filtered.map((d, i) => {
        const t     = logT(d.clicks);
        const pct   = (d.clicks / max * 100).toFixed(1);
        const share = grandTotal > 0 ? (d.clicks / grandTotal * 100).toFixed(1) : '—';
        return (
          <div key={`${d.tag}-${d.menu}`} className="ext-data-row">
            <div className="ext-data-rank">
              {i < 3 ? ['🥇','🥈','🥉'][i] : <span>{i+1}</span>}
            </div>
            <div className="ext-data-top">
              <div className="ext-data-name">
                <span className="ext-data-tag" style={{ background: tagColor[d.tag] }}>{d.tag}</span>
                {d.menu}
              </div>
              <div className="ext-data-meta">
                <span className="ext-data-clicks">{d.clicks.toLocaleString()}</span>
                <span className="ext-data-share">{share}%</span>
              </div>
            </div>
            <div className="ext-data-bar-wrap">
              <div className="ext-data-bar" style={{ width:`${pct}%`, background:heatRgba(t, 0.85) }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 메인 패널 ────────────────────────────────────────────────── */
const ALL_MONTHS = Object.keys(MONTHLY_DATA).sort().reverse();
const ALL_PAGES  = Object.keys(PAGE_CONFIG);

export default function ExternalHeatmapPanel() {
  const [activeMonth, setActiveMonth] = useState(ALL_MONTHS[0]);
  const [page,        setPage]        = useState('news');
  const [device,      setDevice]      = useState('mobile');
  const [areaTab,     setAreaTab]     = useState('header'); // 헤더/본문 탭
  const [bgImages,    setBgImages]    = useState({});

  const pageCfg      = PAGE_CONFIG[page];
  const deviceCfg    = pageCfg.devices[device];
  // areas 구조면 현재 탭 cfg, 아니면 deviceCfg 그대로
  const hasAreas     = !!deviceCfg?.areas;
  const cfg          = hasAreas ? deviceCfg.areas[areaTab] : deviceCfg;
  const deviceData   = MONTHLY_DATA[activeMonth]?.[page]?.[device] ?? { snb: [], gnb: [] };
  const helpers      = makeHelpers(deviceData);
  const bgKey        = `${page}_${device}_${hasAreas ? areaTab : ''}`;
  const bgImage      = bgImages[bgKey] ?? null;

  // cfg.bgSrc 변경 시 BG 로드
  useEffect(() => {
    if (!cfg?.bgSrc) return;
    if (bgImages[bgKey]) return;
    const img = new Image();
    img.onload  = () => setBgImages(prev => ({ ...prev, [bgKey]: img }));
    img.onerror = () => setBgImages(prev => ({ ...prev, [bgKey]: null }));
    img.src = cfg.bgSrc;
  }, [bgKey, cfg?.bgSrc]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => setBgImages(prev => ({ ...prev, [bgKey]: img }));
    img.src = URL.createObjectURL(file);
  }

  function handlePageChange(p) {
    setPage(p);
    setAreaTab('header');
    if (!PAGE_CONFIG[p].devices[device]?.bgSrc &&
        !PAGE_CONFIG[p].devices[device]?.areas &&
        PAGE_CONFIG[p].devices.mobile) {
      setDevice('mobile');
    }
  }

  function handleDeviceChange(d) {
    setDevice(d);
    setAreaTab('header');
  }

  const totalClicks = helpers.gnbTotal + helpers.total + helpers.topTotal +
                      (helpers.section?.reduce((s, d) => s + d.clicks, 0) ?? 0);

  return (
    <div className="ext-heatmap-panel">
      {/* 헤더 */}
      <div className="ext-header">
        <div>
          <div className="ext-title">네이트 · 상단 메뉴 클릭 히트맵</div>
          <div className="ext-subtitle">
            {totalClicks > 0
              ? <>총 {totalClicks.toLocaleString()}회 클릭</>
              : '데이터 없음'}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div className="ext-device-tabs">
            {['pc','mobile'].map(d => (
              <button
                key={d}
                className={`ext-device-tab${device === d ? ' active' : ''}`}
                onClick={() => handleDeviceChange(d)}
              >
                {d === 'pc'
                  ? <><i className="bi bi-display" style={{marginRight:4}}/>PC</>
                  : <><i className="bi bi-phone" style={{marginRight:4}}/>모바일</>}
              </button>
            ))}
          </div>
          <label className="ext-upload-btn">
            배경 교체
            <input type="file" accept="image/*" style={{display:'none'}} onChange={handleFileChange}/>
          </label>
        </div>
      </div>

      {/* 페이지 탭 + 월 선택 */}
      <div className="ext-controls-row">
        <div className="ext-page-tabs">
          {ALL_PAGES.map(p => (
            <button
              key={p}
              className={`ext-page-tab${page === p ? ' active' : ''}`}
              onClick={() => handlePageChange(p)}
            >
              <i className={`bi ${PAGE_CONFIG[p].icon}`} style={{marginRight:5}}/>
              {PAGE_CONFIG[p].label}
            </button>
          ))}
        </div>
        <div className="ext-month-tabs" style={{marginBottom:0}}>
          {ALL_MONTHS.map(m => (
            <button
              key={m}
              className={`ext-month-tab${activeMonth === m ? ' active' : ''}`}
              onClick={() => setActiveMonth(m)}
            >
              {MONTH_LABELS[m] ?? m}
            </button>
          ))}
        </div>
      </div>

      {/* 헤더/본문 영역 탭 (areas가 있을 때만) */}
      {hasAreas && (
        <div className="ext-area-tabs">
          <button
            className={`ext-area-tab${areaTab === 'header' ? ' active' : ''}`}
            onClick={() => setAreaTab('header')}
          >
            <i className="bi bi-layout-text-window-reverse" style={{marginRight:5}}/>헤더
          </button>
          <button
            className={`ext-area-tab${areaTab === 'content' ? ' active' : ''}`}
            onClick={() => setAreaTab('content')}
          >
            <i className="bi bi-layout-text-sidebar" style={{marginRight:5}}/>본문
          </button>
        </div>
      )}

      {/* 본문 */}
      <div className="ext-body">
        <div className="ext-map-col">
          <HeatmapCanvas bgImage={bgImage} helpers={helpers} cfg={cfg} ssW={deviceCfg?.ssW}/>
          <Legend/>
        </div>
        <div className="ext-stat-col">
          <div className="ext-stat-head">메뉴별 클릭 순위</div>
          <DataPanel helpers={helpers} area={hasAreas ? areaTab : null}/>
        </div>
      </div>
    </div>
  );
}
