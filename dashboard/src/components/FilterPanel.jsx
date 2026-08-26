import { useEffect, useRef, useState } from 'react';
import TimePresets from './TimePresets.jsx';
import { pathMetricLabel, pathMetricValue } from './AnalyticsPanel.jsx';

// ─── URL → 읽기 좋은 라벨 변환 ───────────────────────────────
function pathLabel(p) {
  // p는 path 객체({ path, pageTitle, pageGroup, ... }) 또는 문자열
  const urlPath = typeof p === 'string' ? p : p?.path;
  const pageTitle = typeof p === 'object' ? p?.pageTitle : null;
  const pageGroup = typeof p === 'object' ? p?.pageGroup : null;

  // pageTitle이 있으면 우선 사용
  if (pageTitle) return pageTitle;
  // pageGroup이 있으면 사용
  if (pageGroup) return pageGroup;

  if (!urlPath || urlPath === '/') return '홈 (/)';
  // 쿼리스트링 제거, 슬래시 정리
  const clean = urlPath.split('?')[0].replace(/\/$/, '');
  const segments = clean.split('/').filter(Boolean);
  if (!segments.length) return urlPath;
  // 마지막 의미있는 세그먼트
  const last = segments[segments.length - 1]
    .replace(/\.[^.]+$/, '')           // 확장자 제거
    .replace(/[-_]/g, ' ')             // 하이픈·언더바 → 공백
    .replace(/\b\w/g, c => c.toUpperCase()); // 첫 글자 대문자
  // 상위 경로 prefix (최대 1단계)
  const prefix = segments.length > 1 ? segments[segments.length - 2] : '';
  return prefix ? `${last}  ·  ${prefix}` : last;
}

// ─── 검색 가능한 페이지 선택 드롭다운 ────────────────────────
function PathPicker({ paths, value, onChange, pathMetric, onPathMetricChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const current = paths.find(p => p.path === value);

  const filtered = query.trim()
    ? paths.filter(p =>
        p.path.toLowerCase().includes(query.toLowerCase()) ||
        pathLabel(p).toLowerCase().includes(query.toLowerCase())
      )
    : paths;

  // 외부 클릭 시 닫기
  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function select(path) {
    onChange(path);
    setQuery('');
    setOpen(false);
  }

  function handleInputKey(e) {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    if (e.key === 'Enter' && filtered.length > 0) select(filtered[0].path);
  }

  return (
    <div className="path-picker-wrap" ref={wrapRef}>
      {/* 트리거 버튼 */}
      <div className="input-group input-group-sm">
        <button
          type="button"
          className="path-picker-trigger form-select text-start"
          onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {current ? (
            <span className="path-trigger-inner">
              <span className="path-trigger-label">{pathLabel(current)}</span>
              <span className="path-trigger-url">{current.path}</span>
              <span className="path-trigger-badge">
                {pathMetricValue(current, pathMetric)} {pathMetricLabel(pathMetric)}
              </span>
            </span>
          ) : (
            <span className="text-muted">수집된 데이터 없음</span>
          )}
        </button>

        {/* 정렬 select는 그대로 유지 */}
        <label className="input-group-text text-muted" htmlFor="path-metric">정렬</label>
        <select
          id="path-metric"
          className="form-select filter-metric-select"
          value={pathMetric}
          onChange={(e) => onPathMetricChange(e.target.value)}
        >
          {PATH_METRICS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* 드롭다운 */}
      {open && (
        <div className="path-picker-dropdown" role="listbox">
          <div className="path-picker-search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              className="path-picker-input"
              placeholder="URL 또는 페이지명 검색…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleInputKey}
            />
            {query && (
              <button className="path-picker-clear" onClick={() => setQuery('')} type="button">
                <i className="bi bi-x" />
              </button>
            )}
          </div>
          <ul className="path-picker-list">
            {filtered.length === 0 && (
              <li className="path-picker-empty">검색 결과 없음</li>
            )}
            {filtered.map(p => (
              <li
                key={p.path}
                role="option"
                aria-selected={p.path === value}
                className={`path-picker-item${p.path === value ? ' active' : ''}`}
                onClick={() => select(p.path)}
              >
                <span className="path-item-label">{pathLabel(p)}</span>
                <span className="path-item-url">{p.path}</span>
                <span className="path-item-badge">
                  {pathMetricValue(p, pathMetric)} {pathMetricLabel(pathMetric)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── 날짜 프리셋 ──────────────────────────────────────────────
const DATE_PRESETS = [
  { key: 'today',     label: '오늘' },
  { key: 'yesterday', label: '어제' },
  { key: 'd2',        label: '그저께' },
  { key: 'week',      label: '이번 주' },
  { key: 'month',     label: '이번 달' },
  { key: 'all',       label: '전체' },
  { key: 'custom',    label: '직접 입력' },
];

function pad(n) { return String(n).padStart(2, '0'); }

function toLocalDT(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getPresetRange(key) {
  const now  = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (key) {
    case 'today':
      return { from: toLocalDT(today), to: '' };

    case 'yesterday': {
      const d = new Date(today); d.setDate(d.getDate() - 1);
      const end = new Date(d);   end.setHours(23, 59, 0, 0);
      return { from: toLocalDT(d), to: toLocalDT(end) };
    }
    case 'd2': {
      const d = new Date(today); d.setDate(d.getDate() - 2);
      const end = new Date(d);   end.setHours(23, 59, 0, 0);
      return { from: toLocalDT(d), to: toLocalDT(end) };
    }
    case 'week': {
      // 월요일 기준
      const dow = today.getDay();
      const diff = dow === 0 ? 6 : dow - 1;
      const d = new Date(today); d.setDate(today.getDate() - diff);
      return { from: toLocalDT(d), to: '' };
    }
    case 'month': {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toLocalDT(d), to: '' };
    }
    case 'all':
      return { from: '', to: '' };
    default:
      return null;
  }
}

function detectPreset(from, to) {
  if (!from && !to) return 'all';
  for (const p of DATE_PRESETS) {
    if (p.key === 'custom') continue;
    const range = getPresetRange(p.key);
    if (!range) continue;
    if (range.from === from && range.to === to) return p.key;
  }
  return 'custom';
}

// 날짜 프리셋 칩 + 직접 입력 폼
function DateRangeField({ from, to, onFromChange, onToChange }) {
  const [preset, setPreset] = useState(() => detectPreset(from, to));

  // from/to 외부 변경 시 재감지 (탭 전환 등)
  useEffect(() => {
    setPreset(detectPreset(from, to));
  }, [from, to]);

  function handlePreset(key) {
    setPreset(key);
    if (key === 'custom') return; // 입력창만 열어줌
    const range = getPresetRange(key);
    if (range) {
      onFromChange(range.from);
      onToChange(range.to);
    }
  }

  function handleFromChange(v) {
    onFromChange(v);
    setPreset('custom');
  }
  function handleToChange(v) {
    onToChange(v);
    setPreset('custom');
  }

  return (
    <div className="filter-date-preset-wrap">
      <div className="filter-chips filter-date-chips" role="group" aria-label="기간 프리셋">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`filter-chip${preset === p.key ? ' active' : ''}`}
            onClick={() => handlePreset(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="filter-date-range filter-date-range--custom">
          <input
            type="datetime-local"
            className="form-control form-control-sm"
            value={from}
            onChange={(e) => handleFromChange(e.target.value)}
            aria-label="시작일"
          />
          <span className="filter-date-sep">~</span>
          <input
            type="datetime-local"
            className="form-control form-control-sm"
            value={to}
            onChange={(e) => handleToChange(e.target.value)}
            aria-label="종료일"
          />
        </div>
      )}
    </div>
  );
}

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
                  <PathPicker
                    paths={paths}
                    value={selectedPath}
                    onChange={onPathChange}
                    pathMetric={pathMetric}
                    onPathMetricChange={onPathMetricChange}
                  />
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
                  <DateRangeField
                    from={from}
                    to={to}
                    onFromChange={onFromChange}
                    onToChange={onToChange}
                  />
                </FilterField>
              )}
            </div>

            {isRealtime && realtimeCustomRange && (
              <div className="filter-toolbar-row filter-toolbar-row-extra">
                <FilterField label="시작 · 종료" className="filter-field-grow">
                  <DateRangeField
                    from={from}
                    to={to}
                    onFromChange={onFromChange}
                    onToChange={onToChange}
                  />
                </FilterField>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
