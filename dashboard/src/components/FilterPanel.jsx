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

function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="btn-group btn-group-sm" role="group">
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
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="row g-3 align-items-end">
          <div className="col-md-6 col-lg-4">
            <label htmlFor="url-picker" className="form-label small text-muted mb-1">
              URL
            </label>
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
          </div>

          <div className="col-md-3 col-lg-2">
            <label htmlFor="path-metric" className="form-label small text-muted mb-1">
              URL 표시
            </label>
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
          </div>

          <div className="col-md-6 col-lg-3">
            <label className="form-label small text-muted mb-1 d-block">디바이스</label>
            <ToggleGroup options={DEVICE_OPTIONS} value={deviceType} onChange={onDeviceTypeChange} />
          </div>

          {showVariantFilter && (
            <div className="col-md-6 col-lg-3">
              <label className="form-label small text-muted mb-1 d-block">Variant</label>
              <ToggleGroup
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'A', label: 'A' },
                  { value: 'B', label: 'B' },
                ]}
                value={variant}
                onChange={onVariantChange}
              />
            </div>
          )}

          {isRealtime ? (
            <>
              <div className="col-12">
                <label className="form-label small text-muted mb-1 d-block">시간 범위</label>
                <TimePresets value={windowPreset} onChange={onWindowPresetChange} />
              </div>
              <div className="col-md-4 col-lg-3">
                <div className="form-check mt-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="rt-custom-range"
                    checked={realtimeCustomRange}
                    onChange={(e) => onRealtimeCustomRangeChange(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="rt-custom-range">
                    기간 지정
                  </label>
                </div>
              </div>
              {realtimeCustomRange && (
                <>
                  <div className="col-md-4 col-lg-3">
                    <label htmlFor="rt-from" className="form-label small text-muted mb-1">
                      시작일
                    </label>
                    <input
                      id="rt-from"
                      type="datetime-local"
                      className="form-control form-control-sm"
                      value={from}
                      onChange={(e) => onFromChange(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4 col-lg-3">
                    <label htmlFor="rt-to" className="form-label small text-muted mb-1">
                      종료일
                    </label>
                    <input
                      id="rt-to"
                      type="datetime-local"
                      className="form-control form-control-sm"
                      value={to}
                      onChange={(e) => onToChange(e.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="col-md-4 col-lg-3">
                <label htmlFor="from" className="form-label small text-muted mb-1">
                  시작일
                </label>
                <input
                  id="from"
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={from}
                  onChange={(e) => onFromChange(e.target.value)}
                />
              </div>
              <div className="col-md-4 col-lg-3">
                <label htmlFor="to" className="form-label small text-muted mb-1">
                  종료일
                </label>
                <input
                  id="to"
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={to}
                  onChange={(e) => onToChange(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="col-12">
            <span className="badge text-bg-light border text-secondary fw-normal">{statLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
