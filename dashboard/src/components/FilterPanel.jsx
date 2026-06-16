import TimePresets from './TimePresets.jsx';
import { pathMetricLabel, pathMetricValue } from './AnalyticsPanel.jsx';

const DEVICE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'desktop', label: 'PC' },
  { value: 'tablet', label: '태블릿' },
  { value: 'mobile', label: '모바일' },
];

const PATH_METRICS = [
  { value: 'clicks', label: '클릭' },
  { value: 'sessions', label: '세션' },
  { value: 'uv', label: 'UV' },
  { value: 'pageviews', label: 'PV' },
];

export default function FilterPanel({
  mode,
  paths,
  selectedPath,
  onPathChange,
  pathMetric,
  onPathMetricChange,
  from,
  to,
  onFromChange,
  onToChange,
  windowPreset,
  onWindowPresetChange,
  realtimeCustomRange,
  onRealtimeCustomRangeChange,
  deviceType,
  onDeviceTypeChange,
  variant,
  onVariantChange,
  showVariantFilter,
  statLabel,
}) {
  const isRealtime = mode === 'realtime';

  return (
    <div className="filter-panel">
      <div className="filter-field">
        <label htmlFor="url-picker">URL</label>
        <select
          id="url-picker"
          value={selectedPath}
          onChange={(e) => onPathChange(e.target.value)}
        >
          {paths.length === 0 && <option value="">수집된 데이터 없음</option>}
          {paths.map((p) => (
            <option key={p.path} value={p.path}>
              {p.path} ({pathMetricValue(p, pathMetric)} {pathMetricLabel(pathMetric)})
            </option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="path-metric">URL 표시</label>
        <select
          id="path-metric"
          value={pathMetric}
          onChange={(e) => onPathMetricChange(e.target.value)}
        >
          {PATH_METRICS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {showVariantFilter && (
        <div className="filter-field">
          <label>Variant</label>
          <div className="device-tabs">
            {['all', 'A', 'B'].map((v) => (
              <button
                key={v}
                type="button"
                className={variant === v ? 'active' : ''}
                onClick={() => onVariantChange(v)}
              >
                {v === 'all' ? '전체' : v}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="filter-field">
        <label>디바이스</label>
        <div className="device-tabs">
          {DEVICE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={deviceType === opt.value ? 'active' : ''}
              onClick={() => onDeviceTypeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isRealtime ? (
        <>
          <div className="filter-field filter-field-wide">
            <label>시간 범위</label>
            <TimePresets value={windowPreset} onChange={onWindowPresetChange} />
          </div>
          <div className="filter-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={realtimeCustomRange}
                onChange={(e) => onRealtimeCustomRangeChange(e.target.checked)}
              />
              기간 지정
            </label>
          </div>
          {realtimeCustomRange && (
            <>
              <div className="filter-field">
                <label htmlFor="rt-from">시작일</label>
                <input
                  id="rt-from"
                  type="datetime-local"
                  value={from}
                  onChange={(e) => onFromChange(e.target.value)}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="rt-to">종료일</label>
                <input
                  id="rt-to"
                  type="datetime-local"
                  value={to}
                  onChange={(e) => onToChange(e.target.value)}
                />
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="filter-field">
            <label htmlFor="from">시작일</label>
            <input
              id="from"
              type="datetime-local"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
            />
          </div>
          <div className="filter-field">
            <label htmlFor="to">종료일</label>
            <input
              id="to"
              type="datetime-local"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
            />
          </div>
        </>
      )}

      <div className="filter-field">
        <span className="stat">{statLabel}</span>
      </div>
    </div>
  );
}
