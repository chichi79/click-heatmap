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

function FilterChips({ options, value, onChange, ariaLabel }) {
  return (
    <div className="filter-chips" role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`filter-chip${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FilterField({ label, children, className = '' }) {
  return (
    <div className={`filter-field ${className}`.trim()}>
      <span className="filter-field-label">{label}</span>
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
    <div
      className={`card dashboard-card filter-panel filter-panel--${mode}${
        isRealtime && realtimeCustomRange ? ' filter-panel--custom-range' : ''
      } border-0 shadow-sm mb-4`}
    >
      <div className="card-body">
        <div className="filter-toolbar">
          <div className="filter-toolbar-head">
            <span className="filter-toolbar-title">
              <i className="bi bi-sliders" aria-hidden="true" />
              조회 조건
            </span>
            <span className="filter-stat-badge">{statLabel}</span>
          </div>

          <div className="filter-toolbar-rows">
            <div className="filter-toolbar-row filter-toolbar-row-primary">
              {isAb ? (
                <div className="filter-row-note">
                  A/B 탭은 실험별 path 기준으로 결과를 확인합니다
                </div>
              ) : (
                <FilterField label="페이지" className="filter-field-grow">
                  <div className="input-group input-group-sm">
                    <select
                      id="url-picker"
                      className="form-select"
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
                    <label className="input-group-text text-muted" htmlFor="path-metric">
                      정렬
                    </label>
                    <select
                      id="path-metric"
                      className="form-select filter-metric-select"
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
                </FilterField>
              )}
            </div>

            <div className="filter-toolbar-row filter-toolbar-row-options">
              <FilterField label="디바이스">
                <FilterChips
                  ariaLabel="디바이스"
                  options={DEVICE_OPTIONS}
                  value={deviceType}
                  onChange={onDeviceTypeChange}
                />
              </FilterField>

              {showVariantFilter && (
                <>
                  <div className="filter-divider" aria-hidden="true" />
                  <FilterField label="Variant">
                    <FilterChips
                      ariaLabel="Variant"
                      options={[
                        { value: 'all', label: '전체' },
                        { value: 'A', label: 'A' },
                        { value: 'B', label: 'B' },
                      ]}
                      value={variant}
                      onChange={onVariantChange}
                    />
                  </FilterField>
                </>
              )}
            </div>

            <div className="filter-toolbar-row filter-toolbar-row-time">
              {isRealtime ? (
                <>
                  <FilterField label="시간 범위" className="filter-field-grow">
                    <TimePresets
                      value={windowPreset}
                      onChange={onWindowPresetChange}
                      disabled={realtimeCustomRange}
                    />
                  </FilterField>
                  <div className="filter-divider" aria-hidden="true" />
                  <FilterField label="기간 지정" className="filter-field-switch">
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="rt-custom-range"
                        checked={realtimeCustomRange}
                        onChange={(e) => onRealtimeCustomRangeChange(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="rt-custom-range">
                        {realtimeCustomRange ? '사용 중' : '끔'}
                      </label>
                    </div>
                  </FilterField>
                </>
              ) : (
                <FilterField label="기간" className="filter-field-grow">
                  <div className="filter-date-range">
                    <input
                      id="from"
                      type="datetime-local"
                      className="form-control form-control-sm"
                      value={from}
                      onChange={(e) => onFromChange(e.target.value)}
                      aria-label="시작일"
                    />
                    <span className="filter-date-sep">~</span>
                    <input
                      id="to"
                      type="datetime-local"
                      className="form-control form-control-sm"
                      value={to}
                      onChange={(e) => onToChange(e.target.value)}
                      aria-label="종료일"
                    />
                  </div>
                </FilterField>
              )}
            </div>

            {isRealtime && realtimeCustomRange && (
              <div className="filter-toolbar-row filter-toolbar-row-extra">
                <FilterField label="시작 · 종료" className="filter-field-grow">
                  <div className="filter-date-range">
                    <input
                      id="rt-from"
                      type="datetime-local"
                      className="form-control form-control-sm"
                      value={from}
                      onChange={(e) => onFromChange(e.target.value)}
                      aria-label="시작일"
                    />
                    <span className="filter-date-sep">~</span>
                    <input
                      id="rt-to"
                      type="datetime-local"
                      className="form-control form-control-sm"
                      value={to}
                      onChange={(e) => onToChange(e.target.value)}
                      aria-label="종료일"
                    />
                  </div>
                </FilterField>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
