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
app.use(cors());

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
