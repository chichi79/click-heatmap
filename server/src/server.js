import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import collectRouter from './routes/collect.js';
import queryRouter from './routes/query.js';
import abRouter from './routes/ab.js';
import { screenshotsDir } from './db.js';
import { setupLiveServer } from './live.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// 허용 도메인 목록 (환경변수로 추가 가능)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// 기본 허용 도메인
const DEFAULT_ORIGINS = [
  'https://on-deal.nate.com',
  'https://news.nate.com',
  'https://click-heatmap.vercel.app',
  'http://localhost:5173',
  'http://localhost:4000',
  'http://localhost:3000',
];

// 와일드카드 패턴 허용 (환경변수로 추가 가능)
// 예: ALLOWED_ORIGIN_PATTERNS=*.shopby.co.kr,*.nate.com
const ALLOWED_PATTERNS = (process.env.ALLOWED_ORIGIN_PATTERNS || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => new RegExp('^https://' + p.replace(/\./g, '\\.').replace(/\*/g, '[^.]+') + '$'));

// 기본 와일드카드 패턴
const DEFAULT_PATTERNS = [
  /^https:\/\/[^.]+\.shopby\.co\.kr$/,
];

const allPatterns = [...DEFAULT_PATTERNS, ...ALLOWED_PATTERNS];
const allowedSet = new Set([...DEFAULT_ORIGINS, ...ALLOWED_ORIGINS]);

app.use(
  cors({
    origin(origin, cb) {
      // origin 없는 요청 (서버간, curl 등) 허용
      if (!origin) return cb(null, true);
      if (allowedSet.has(origin)) return cb(null, true);
      if (allPatterns.some((re) => re.test(origin))) return cb(null, true);
      cb(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(
  '/api/heatmap',
  express.json({ type: ['application/json', 'text/plain'] })
);
app.use('/api/screenshot', express.json({ limit: '10mb' }));
app.use('/api', express.json());

app.use('/api', collectRouter);
app.use('/api', queryRouter);
app.use('/api', abRouter);

app.get('/heatmap-sdk.js', (_req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});
app.use('/heatmap-sdk.js', express.static(path.join(__dirname, '../../sdk/heatmap-sdk.js')));
app.use(
  '/html2canvas.min.js',
  express.static(path.join(__dirname, '../node_modules/html2canvas/dist/html2canvas.min.js'))
);
app.use('/screenshots', express.static(screenshotsDir));
app.use('/demo', express.static(path.join(__dirname, '../../demo')));

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
setupLiveServer(server);

server.listen(PORT, () => {
  console.log(`heatmap server listening on http://localhost:${PORT}`);
});
