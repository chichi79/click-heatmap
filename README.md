# Click Heatmap

스크립트 태그 한 줄로 삽입하는 클릭/스크롤 히트맵 수집·시각화 도구.

```
sdk/        SDK 스크립트 (heatmap-sdk.js)
server/     수집 API 서버 (Express + node:sqlite)
dashboard/  히트맵 대시보드 (React + Vite + Recharts)
demo/       SDK 동작 확인용 데모 페이지
```

## 동작 흐름

1. **SDK** — 페이지에 삽입되면 클릭 좌표를 `%` 단위(뷰포트 기준)로, 스크롤은 최대 도달 깊이를 수집해 50건 또는 5초마다 `sendBeacon`으로 전송. 오프라인 시 IndexedDB에 보관 후 재전송.
2. **수집 서버** — `/api/heatmap`에서 이벤트를 받아 SQLite(`server/data/heatmap.db`)에 저장하고, `/heatmap-sdk.js`로 SDK 파일을 서빙.
3. **대시보드** — URL/기간 필터로 클릭 좌표를 Canvas 히트맵으로 렌더링하고, 스크롤 깊이별 도달 세션 비율을 영역 차트로 표시.

## 실행 방법

```bash
# 1) 수집 서버 (포트 4000)
cd server
npm install
npm start

# 2) 대시보드 (포트 5173, /api는 4000으로 proxy)
cd dashboard
npm install
npm run dev
```

데모 페이지(`http://localhost:4000/demo/`)를 열어 클릭/스크롤하면 대시보드에 데이터가 반영됩니다.

## 실제 페이지에 삽입하기

```html
<script src="http://localhost:4000/heatmap-sdk.js" defer></script>
```

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/heatmap` | 이벤트 배치 저장 |
| GET | `/api/paths` | 수집된 URL(path) 목록 + 건수 |
| GET | `/api/heatmap-data?path=&from=&to=&type=click` | 히트맵 좌표 목록 |
| GET | `/api/scroll-depth?path=&from=&to=` | 스크롤 깊이별 도달 세션 비율 |
| GET | `/api/timeline?path=&type=click&interval=day` | 시간대별 이벤트 집계 |

## GitHub + Vercel 배포

구조상 **대시보드**와 **API 서버**를 나눠 배포합니다.

| 구성 | 배포 | 이유 |
| --- | --- | --- |
| `dashboard/` | **Vercel** | React 정적 빌드 |
| `server/` | **Render** 등 | Express + SQLite + WebSocket (Vercel 서버리스 불가) |

### 1) GitHub에 올리기

```bash
cd click-heatmap
git init
git add .
git commit -m "Initial commit: click heatmap"
```

GitHub에서 새 저장소를 만든 뒤:

```bash
git remote add origin https://github.com/YOUR_USERNAME/click-heatmap.git
git branch -M main
git push -u origin main
```

### 2) API 서버 배포 (Render)

1. [render.com](https://render.com) → **New Blueprint** → GitHub 저장소 연결
2. 루트의 `render.yaml`이 자동으로 `server/` 서비스를 생성합니다
3. 배포 완료 후 URL 확인 (예: `https://heatmap-api.onrender.com`)

로컬 Docker로도 실행 가능합니다 (`Dockerfile` 참고).

### 3) 대시보드 배포 (Vercel)

1. [vercel.com](https://vercel.com) → **Add New Project** → GitHub 저장소 import
2. **Root Directory** → `dashboard` 선택
3. Framework Preset: **Vite** (자동 감지)
4. Environment Variables 추가:

| 이름 | 값 |
| --- | --- |
| `VITE_API_BASE` | `https://heatmap-api.onrender.com` (Render API URL) |

5. **Deploy**

배포 후 `https://your-app.vercel.app` 에서 대시보드에 접속합니다.

### SDK 삽입 (운영)

API 서버 URL 기준:

```html
<script src="https://heatmap-api.onrender.com/heatmap-sdk.js" defer></script>
```

데모 페이지: `https://heatmap-api.onrender.com/demo/`

### 로컬 개발

`VITE_API_BASE` 없이 실행하면 Vite proxy가 `localhost:4000`으로 API를 전달합니다.

```bash
# server (4000)
cd server && npm install && npm start

# dashboard (5173)
cd dashboard && npm install && npm run dev
```
