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

function ToggleGroup({ options, value, onChange, ariaLabel }) {
  return (
    <div className="btn-group btn-group-sm filter-toggle" role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`btn${value === opt.value ? ' btn-primary' : ' btn-outline-secondary'}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FilterGroup({ label, children, className = '' }) {
  return (
    <div className={`filter-group ${className}`.trim()}>
      <span className="filter-group-label">{label}</span>
      {children}
    </div>
  );
}

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
  const isAb = mode === 'ab';

  return (
    <div className="card dashboard-card filter-panel border-0 shadow-sm mb-4">
      <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between gap-2 py-3">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-funnel text-primary" aria-hidden="true" />
          <span className="fw-semibold small">필터</span>
        </div>
        <span className="badge rounded-pill text-bg-primary-subtle text-primary-emphasis border border-primary-subtle fw-normal">
          {statLabel}
        </span>
      </div>
      <div className="card-body">
        <div className="filter-grid">
          {!isAb && (
            <FilterGroup label="URL" className="filter-url">
              <select
                id="url-picker"
                className="form-select form-select-sm"
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
            </FilterGroup>
          )}

          {!isAb && (
            <FilterGroup label="URL 표시">
              <select
                id="path-metric"
                className="form-select form-select-sm"
                value={pathMetric}
                onChange={(e) => onPathMetricChange(e.target.value)}
              >
                {PATH_METRICS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </FilterGroup>
          )}

          <FilterGroup label="디바이스">
            <ToggleGroup
              ariaLabel="디바이스"
              options={DEVICE_OPTIONS}
              value={deviceType}
              onChange={onDeviceTypeChange}
            />
          </FilterGroup>

          {showVariantFilter && (
            <FilterGroup label="Variant">
              <ToggleGroup
                ariaLabel="Variant"
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'A', label: 'A' },
                  { value: 'B', label: 'B' },
                ]}
                value={variant}
                onChange={onVariantChange}
              />
            </FilterGroup>
          )}

          {isRealtime ? (
            <>
              <FilterGroup label="시간 범위" className="filter-span-wide">
                <TimePresets value={windowPreset} onChange={onWindowPresetChange} />
              </FilterGroup>
              <FilterGroup label="기간 지정" className="filter-check">
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="rt-custom-range"
                    checked={realtimeCustomRange}
                    onChange={(e) => onRealtimeCustomRangeChange(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="rt-custom-range">
                    사용
                  </label>
                </div>
              </FilterGroup>
              {realtimeCustomRange && (
                <>
                  <FilterGroup label="시작">
                    <input
                      id="rt-from"
                      type="datetime-local"
                      className="form-control form-control-sm"
                      value={from}
                      onChange={(e) => onFromChange(e.target.value)}
                    />
                  </FilterGroup>
                  <FilterGroup label="종료">
                    <input
                      id="rt-to"
                      type="datetime-local"
                      className="form-control form-control-sm"
                      value={to}
                      onChange={(e) => onToChange(e.target.value)}
                    />
                  </FilterGroup>
                </>
              )}
            </>
          ) : (
            <>
              <FilterGroup label="시작">
                <input
                  id="from"
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={from}
                  onChange={(e) => onFromChange(e.target.value)}
                />
              </FilterGroup>
              <FilterGroup label="종료">
                <input
                  id="to"
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={to}
                  onChange={(e) => onToChange(e.target.value)}
                />
              </FilterGroup>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
