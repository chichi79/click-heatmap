import { useCallback, useEffect, useState } from 'react';
import FilterPanel from './components/FilterPanel.jsx';
import HeatmapViewer from './components/HeatmapViewer.jsx';
import ScrollDepthChart from './components/ScrollDepthChart.jsx';
import ElementClickRanking from './components/ElementClickRanking.jsx';
import ViewModeTabs, { getModeMeta } from './components/ViewModeTabs.jsx';
import LiveStatsBar from './components/LiveStatsBar.jsx';
import ClickFeed from './components/ClickFeed.jsx';
import PathPlot from './components/PathPlot.jsx';
import AnalyticsPanel from './components/AnalyticsPanel.jsx';
import FunnelPanel from './components/FunnelPanel.jsx';
import AbTestPanel from './components/AbTestPanel.jsx';
import { presetToMinutes, WINDOW_PRESETS } from './components/TimePresets.jsx';
import { useLiveFeed } from './hooks/useLiveFeed.js';
import { apiUrl } from './api.js';

function toEpoch(datetimeLocal) {
  if (!datetimeLocal) return '';
  const ms = new Date(datetimeLocal).getTime();
  return Number.isNaN(ms) ? '' : String(ms);
}

function buildParams(path, from, to, deviceType, variant = 'all') {
  const params = new URLSearchParams({ path });
  const fromEpoch = toEpoch(from);
  const toEpochVal = toEpoch(to);
  if (fromEpoch) params.set('from', fromEpoch);
  if (toEpochVal) params.set('to', toEpochVal);
  if (deviceType && deviceType !== 'all') params.set('deviceType', deviceType);
  if (variant && variant !== 'all') params.set('variant', variant);
  return params;
}

function buildGlobalParams(from, to, deviceType) {
  const params = new URLSearchParams();
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
  const [pathMetric, setPathMetric] = useState('clicks');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [windowPreset, setWindowPreset] = useState(5);
  const [realtimeCustomRange, setRealtimeCustomRange] = useState(false);
  const [deviceType, setDeviceType] = useState('all');
  const [uxClicks, setUxClicks] = useState([]);
  const [scrollDepth, setScrollDepth] = useState({ total: 0, data: [] });
  const [elements, setElements] = useState([]);
  const [pathPlot, setPathPlot] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [funnelSteps, setFunnelSteps] = useState('/,/demo/');
  const [screenshot, setScreenshot] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState(null);
  const [abResults, setAbResults] = useState(null);
  const [variantFilter, setVariantFilter] = useState('all');

  const windowMinutes = presetToMinutes(windowPreset);
  const isRealtime = viewMode === 'realtime';
  const isUx = viewMode === 'ux';
  const isPath = viewMode === 'path';
  const isAnalytics = viewMode === 'analytics';
  const isAb = viewMode === 'ab';
  const modeMeta = getModeMeta(viewMode);

  const activeExperimentForPath = experiments.find(
    (e) => e.status === 'active' && e.path === selectedPath
  );
  const showVariantFilter = Boolean(activeExperimentForPath);

  const effectiveFrom = isRealtime && !realtimeCustomRange ? '' : from;
  const effectiveTo = isRealtime && !realtimeCustomRange ? '' : to;

  const { clicks: liveClicks, feed, connected, stats } = useLiveFeed({
    path: selectedPath,
    deviceType,
    variant: variantFilter,
    windowMinutes,
    from: effectiveFrom,
    to: effectiveTo,
    useCustomRange: isRealtime && realtimeCustomRange,
    enabled: isRealtime,
  });

  const heatmapClicks = isRealtime ? liveClicks : uxClicks;
  const statLabel = isPath
    ? `분석 세션: ${pathPlot?.totalSessions ?? 0}`
    : isAb
      ? `실험: ${experiments.filter((e) => e.status === 'active').length}개 진행 중`
      : isAnalytics
        ? `UV: ${analytics?.uv ?? 0} · PV: ${analytics?.pageviews ?? 0}`
        : `클릭: ${isRealtime ? liveClicks.length : uxClicks.length}${showVariantFilter ? ` · Variant ${variantFilter === 'all' ? '전체' : variantFilter}` : ''}`;

  const loadPaths = useCallback(() => {
    const params = buildGlobalParams(effectiveFrom, effectiveTo, deviceType);
    const qs = params.toString();
    fetch(apiUrl(`/api/paths${qs ? `?${qs}` : ''}`))
      .then((res) => res.json())
      .then((rows) => {
        setPaths(rows);
        if (rows.length > 0) setSelectedPath((prev) => prev || rows[0].path);
      })
      .catch(() => setPaths([]));
  }, [effectiveFrom, effectiveTo, deviceType]);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  const loadExperiments = useCallback(() => {
    fetch(apiUrl('/api/ab/experiments'))
      .then((res) => res.json())
      .then((rows) => {
        setExperiments(rows);
        setSelectedExperimentId((prev) => prev || rows[0]?.id || null);
      })
      .catch(() => setExperiments([]));
  }, []);

  useEffect(() => {
    loadExperiments();
  }, [loadExperiments]);

  useEffect(() => {
    if (!isAb || !selectedExperimentId) {
      setAbResults(null);
      return;
    }
    const params = new URLSearchParams({ experimentId: String(selectedExperimentId) });
    const fromEpoch = toEpoch(from);
    const toEpochVal = toEpoch(to);
    if (fromEpoch) params.set('from', fromEpoch);
    if (toEpochVal) params.set('to', toEpochVal);

    fetch(apiUrl(`/api/ab/results?${params.toString()}`))
      .then((res) => res.json())
      .then(setAbResults)
      .catch(() => setAbResults(null));
  }, [selectedExperimentId, from, to, isAb]);

  async function createExperiment(payload) {
    const res = await fetch(apiUrl('/api/ab/experiments'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '생성 실패');
    loadExperiments();
    setSelectedExperimentId(data.id);
  }

  async function toggleExperimentStatus(id, status) {
    await fetch(apiUrl(`/api/ab/experiments/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadExperiments();
  }

  function handleViewHeatmap(path, variant) {
    setSelectedPath(path);
    setVariantFilter(variant);
    setViewMode('ux');
  }

  useEffect(() => {
    if (!isUx || !selectedPath) {
      if (!selectedPath) setUxClicks([]);
      return;
    }

    const params = buildParams(selectedPath, from, to, deviceType, variantFilter);

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
  }, [selectedPath, from, to, deviceType, variantFilter, isUx]);

  useEffect(() => {
    if (!isPath || !selectedPath) {
      setPathPlot(null);
      return;
    }

    const params = buildParams(selectedPath, from, to, deviceType, variantFilter);
    fetch(apiUrl(`/api/path-plot?${params.toString()}`))
      .then((res) => res.json())
      .then(setPathPlot)
      .catch(() => setPathPlot(null));
  }, [selectedPath, from, to, deviceType, variantFilter, isPath]);

  useEffect(() => {
    if (!isAnalytics || !selectedPath) {
      setAnalytics(null);
      return;
    }

    const params = buildParams(selectedPath, from, to, deviceType, variantFilter);
    fetch(apiUrl(`/api/analytics?${params.toString()}`))
      .then((res) => res.json())
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, [selectedPath, from, to, deviceType, variantFilter, isAnalytics]);

  const loadFunnel = useCallback(() => {
    const params = buildGlobalParams(from, to, deviceType);
    params.set('steps', funnelSteps);
    fetch(apiUrl(`/api/funnel?${params.toString()}`))
      .then((res) => res.json())
      .then(setFunnel)
      .catch(() => setFunnel(null));
  }, [from, to, deviceType, funnelSteps]);

  useEffect(() => {
    if (!isAnalytics) setFunnel(null);
  }, [isAnalytics]);

  useEffect(() => {
    if (isPath || !selectedPath) {
      if (!selectedPath) setScreenshot(null);
      return;
    }

    if (isRealtime && !realtimeCustomRange) {
      const fromTs = Date.now() - windowMinutes * 60 * 1000;
      const params = new URLSearchParams({
        path: selectedPath,
        from: String(fromTs),
      });
      if (deviceType !== 'all') params.set('deviceType', deviceType);
      if (variantFilter !== 'all') params.set('variant', variantFilter);

      fetch(apiUrl(`/api/scroll-depth?${params.toString()}`))
        .then((res) => res.json())
        .then(setScrollDepth)
        .catch(() => setScrollDepth({ total: 0, data: [] }));
    } else if (isRealtime && realtimeCustomRange) {
      const params = buildParams(selectedPath, from, to, deviceType, variantFilter);
      fetch(apiUrl(`/api/scroll-depth?${params.toString()}`))
        .then((res) => res.json())
        .then(setScrollDepth)
        .catch(() => setScrollDepth({ total: 0, data: [] }));
    }

    fetchScreenshot(selectedPath, deviceType)
      .then(setScreenshot)
      .catch(() => setScreenshot(null));
  }, [
    selectedPath,
    deviceType,
    windowMinutes,
    isRealtime,
    isUx,
    isPath,
    realtimeCustomRange,
    from,
    to,
    variantFilter,
  ]);

  return (
    <div className="min-vh-100">
      <header className="bg-white border-bottom shadow-sm sticky-top">
        <div className="container-fluid px-3 px-lg-4 py-3">
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-lg-between gap-3">
            <div>
              <h1 className="h4 mb-1 fw-semibold text-dark">Click Heatmap Dashboard</h1>
              <p className="text-muted small mb-0">{modeMeta.subtitle}</p>
            </div>
            <ViewModeTabs mode={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </header>

      <main className="container-fluid px-3 px-lg-4 py-4">

      {isRealtime && (
        <LiveStatsBar
          connected={connected}
          minuteClicks={stats.minuteClicks}
          activeSessions={stats.activeSessions}
          activeVisitors={stats.activeVisitors}
          windowClicks={stats.windowClicks}
          windowLabel={realtimeCustomRange ? '선택 기간' : windowLabel(windowPreset)}
          historical={realtimeCustomRange}
        />
      )}

      <FilterPanel
        mode={viewMode}
        paths={paths}
        selectedPath={selectedPath}
        onPathChange={setSelectedPath}
        pathMetric={pathMetric}
        onPathMetricChange={setPathMetric}
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        windowPreset={windowPreset}
        onWindowPresetChange={setWindowPreset}
        realtimeCustomRange={realtimeCustomRange}
        onRealtimeCustomRangeChange={setRealtimeCustomRange}
        deviceType={deviceType}
        onDeviceTypeChange={setDeviceType}
        variant={variantFilter}
        onVariantChange={setVariantFilter}
        showVariantFilter={showVariantFilter}
        statLabel={statLabel}
      />

      {isAb && (
        <AbTestPanel
          experiments={experiments}
          results={abResults}
          selectedExperimentId={selectedExperimentId}
          onSelectExperiment={setSelectedExperimentId}
          onCreate={createExperiment}
          onToggleStatus={toggleExperimentStatus}
          onViewHeatmap={handleViewHeatmap}
          from={from}
          to={to}
        />
      )}

      {isAnalytics && (
        <>
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
              <h2 className="h6 mb-0 fw-semibold">방문 분석 · {selectedPath || 'URL 선택'}</h2>
            </div>
            <div className="card-body">
              <AnalyticsPanel data={analytics} />
            </div>
          </div>
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
              <h2 className="h6 mb-0 fw-semibold">퍼널 분석</h2>
            </div>
            <div className="card-body">
              <FunnelPanel
                data={funnel}
                steps={funnelSteps}
                onStepsChange={setFunnelSteps}
                onAnalyze={loadFunnel}
              />
            </div>
          </div>
        </>
      )}

      {isPath && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
            <h2 className="h6 mb-0 fw-semibold">Path Plot</h2>
          </div>
          <div className="card-body">
            <PathPlot data={pathPlot} />
          </div>
        </div>
      )}

      {(isUx || isRealtime) && (
        <div className={`grid${isRealtime ? ' grid-live' : ''}`}>
          <div className={`card border-0 shadow-sm mb-4 mb-lg-0${isRealtime ? ' card-heatmap' : ''}`}>
            <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
              <h2 className="h6 mb-0 fw-semibold">{isRealtime ? 'RealTime 히트맵' : 'UX 히트맵'}</h2>
            </div>
            <div className="card-body">
              <HeatmapViewer
                clicks={heatmapClicks}
                screenshot={screenshot}
                liveMode={isRealtime}
              />
            </div>
          </div>

          {isRealtime ? (
            <div className="card border-0 shadow-sm card-feed">
              <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
                <h2 className="h6 mb-0 fw-semibold">방금 클릭됨</h2>
              </div>
              <div className="card-body pt-2">
                <ClickFeed items={feed} />
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm mb-4 mb-lg-0">
              <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
                <h2 className="h6 mb-0 fw-semibold">스크롤 깊이</h2>
              </div>
              <div className="card-body">
                <ScrollDepthChart data={scrollDepth.data} total={scrollDepth.total} />
              </div>
            </div>
          )}
        </div>
      )}

      {isUx && (
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
            <h2 className="h6 mb-0 fw-semibold">클릭 요소 랭킹</h2>
          </div>
          <div className="card-body">
            <ElementClickRanking elements={elements} />
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
