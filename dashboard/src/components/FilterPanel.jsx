import TimePresets from './TimePresets.jsx';

const DEVICE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'desktop', label: 'PC' },
  { value: 'tablet', label: '태블릿' },
  { value: 'mobile', label: '모바일' },
];

export default function FilterPanel({
  mode,
  paths,
  selectedPath,
  onPathChange,
  from,
  to,
  onFromChange,
  onToChange,
  windowPreset,
  onWindowPresetChange,
  deviceType,
  onDeviceTypeChange,
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
              {p.path} ({p.count})
            </option>
          ))}
        </select>
      </div>

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
        <div className="filter-field filter-field-wide">
          <label>시간 범위</label>
          <TimePresets value={windowPreset} onChange={onWindowPresetChange} />
        </div>
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
