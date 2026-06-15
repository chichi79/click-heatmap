import { useEffect, useState } from 'react';
import FilterPanel from './components/FilterPanel.jsx';
import HeatmapViewer from './components/HeatmapViewer.jsx';
import ScrollDepthChart from './components/ScrollDepthChart.jsx';
import ElementClickRanking from './components/ElementClickRanking.jsx';
import ViewModeTabs, { getModeMeta } from './components/ViewModeTabs.jsx';
import LiveStatsBar from './components/LiveStatsBar.jsx';
import ClickFeed from './components/ClickFeed.jsx';
import PathPlot from './components/PathPlot.jsx';
import { presetToMinutes, WINDOW_PRESETS } from './components/TimePresets.jsx';
import { useLiveFeed } from './hooks/useLiveFeed.js';
import { apiUrl } from './api.js';

function toEpoch(datetimeLocal) {
  if (!datetimeLocal) return '';
  const ms = new Date(datetimeLocal).getTime();
  return Number.isNaN(ms) ? '' : String(ms);
}

function buildParams(path, from, to, deviceType) {
  const params = new URLSearchParams({ path });
  const fromEpoch = toEpoch(from);
  const toEpochVal = toEpoch(to);
  if (fromEpoch) params.set('from', fromEpoch);
  if (toEpochVal) params.set('to', toEpochVal);
  if (deviceType && deviceType !== 'all') params.set('deviceType', deviceType);
  return params;
}

const SCREENSHOT_DEVICE_ORDER = ['desktop', 'tablet', 'mobile'];

async function fetchScreenshot(pagePath, deviceType) {
  const types = deviceType === 'all' ? SCREENSHOT_DEVICE_ORDER : [deviceType];

  for (const type of types) {
    const res = await fetch(
      apiUrl(`/api/screenshot?path=${encodeURIComponent(pagePath)}&deviceType=${type}`)
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.url) data.url = apiUrl(data.url);
      return data;
    }
  }
  return null;
}

function windowLabel(preset) {
  return WINDOW_PRESETS.find((p) => p.value === preset)?.label ?? '선택 구간';
}

export default function App() {
  const [viewMode, setViewMode] = useState('realtime');
  const [paths, setPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [windowPreset, setWindowPreset] = useState(5);
  const [deviceType, setDeviceType] = useState('all');
  const [uxClicks, setUxClicks] = useState([]);
  const [scrollDepth, setScrollDepth] = useState({ total: 0, data: [] });
  const [elements, setElements] = useState([]);
  const [pathPlot, setPathPlot] = useState(null);
  const [screenshot, setScreenshot] = useState(null);

  const windowMinutes = presetToMinutes(windowPreset);
  const isRealtime = viewMode === 'realtime';
  const isUx = viewMode === 'ux';
  const isPath = viewMode === 'path';
  const modeMeta = getModeMeta(viewMode);

  const { clicks: liveClicks, feed, connected, stats } = useLiveFeed({
    path: selectedPath,
    deviceType,
    windowMinutes,
    enabled: isRealtime,
  });

  const heatmapClicks = isRealtime ? liveClicks : uxClicks;
  const statLabel = isPath
    ? `분석 세션: ${pathPlot?.totalSessions ?? 0}`
    : `클릭 수집 건수: ${isRealtime ? liveClicks.length : uxClicks.length}`;

  useEffect(() => {
    fetch(apiUrl('/api/paths'))
      .then((res) => res.json())
      .then((rows) => {
        setPaths(rows);
        if (rows.length > 0) setSelectedPath((prev) => prev || rows[0].path);
      })
      .catch(() => setPaths([]));
  }, []);

  useEffect(() => {
    if (!isUx || !selectedPath) {
      if (!selectedPath) setUxClicks([]);
      return;
    }

    const params = buildParams(selectedPath, from, to, deviceType);

    fetch(apiUrl(`/api/heatmap-data?${params.toString()}`))
      .then((res) => res.json())
      .then(setUxClicks)
      .catch(() => setUxClicks([]));

    fetch(apiUrl(`/api/scroll-depth?${params.toString()}`))
      .then((res) => res.json())
      .then(setScrollDepth)
      .catch(() => setScrollDepth({ total: 0, data: [] }));

    fetch(apiUrl(`/api/element-clicks?${params.toString()}`))
      .then((res) => res.json())
      .then(setElements)
      .catch(() => setElements([]));
  }, [selectedPath, from, to, deviceType, isUx]);

  useEffect(() => {
    if (!isPath || !selectedPath) {
      setPathPlot(null);
      return;
    }

    const params = buildParams(selectedPath, from, to, deviceType);
    fetch(apiUrl(`/api/path-plot?${params.toString()}`))
      .then((res) => res.json())
      .then(setPathPlot)
      .catch(() => setPathPlot(null));
  }, [selectedPath, from, to, deviceType, isPath]);

  useEffect(() => {
    if (isPath || !selectedPath) {
      if (!selectedPath) setScreenshot(null);
      return;
    }

    if (isRealtime) {
      const fromTs = Date.now() - windowMinutes * 60 * 1000;
      const params = new URLSearchParams({
        path: selectedPath,
        from: String(fromTs),
      });
      if (deviceType !== 'all') params.set('deviceType', deviceType);

      fetch(apiUrl(`/api/scroll-depth?${params.toString()}`))
        .then((res) => res.json())
        .then(setScrollDepth)
        .catch(() => setScrollDepth({ total: 0, data: [] }));
    }

    fetchScreenshot(selectedPath, deviceType)
      .then(setScreenshot)
      .catch(() => setScreenshot(null));
  }, [selectedPath, deviceType, windowMinutes, isRealtime, isUx, isPath]);

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <h1>Click Heatmap Dashboard</h1>
          <p className="subtitle">{modeMeta.subtitle}</p>
        </div>
        <ViewModeTabs mode={viewMode} onChange={setViewMode} />
      </div>

      {isRealtime && (
        <LiveStatsBar
          connected={connected}
          minuteClicks={stats.minuteClicks}
          activeSessions={stats.activeSessions}
          windowClicks={stats.windowClicks}
          windowLabel={windowLabel(windowPreset)}
        />
      )}

      <FilterPanel
        mode={viewMode}
        paths={paths}
        selectedPath={selectedPath}
        onPathChange={setSelectedPath}
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        windowPreset={windowPreset}
        onWindowPresetChange={setWindowPreset}
        deviceType={deviceType}
        onDeviceTypeChange={setDeviceType}
        statLabel={statLabel}
      />

      {isPath && (
        <div className="card">
          <h2>Path Plot</h2>
          <PathPlot data={pathPlot} />
        </div>
      )}

      {(isUx || isRealtime) && (
        <div className={`grid${isRealtime ? ' grid-live' : ''}`}>
          <div className={`card${isRealtime ? ' card-heatmap' : ''}`}>
            <h2>{isRealtime ? 'RealTime 히트맵' : 'UX 히트맵'}</h2>
            <HeatmapViewer
              clicks={heatmapClicks}
              screenshot={screenshot}
              liveMode={isRealtime}
            />
          </div>

          {isRealtime ? (
            <div className="card card-feed">
              <h2>방금 클릭됨</h2>
              <ClickFeed items={feed} />
            </div>
          ) : (
            <div className="card">
              <h2>스크롤 깊이</h2>
              <ScrollDepthChart data={scrollDepth.data} total={scrollDepth.total} />
            </div>
          )}
        </div>
      )}

      {isUx && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2>클릭 요소 랭킹</h2>
          <ElementClickRanking elements={elements} />
        </div>
      )}
    </div>
  );
}
