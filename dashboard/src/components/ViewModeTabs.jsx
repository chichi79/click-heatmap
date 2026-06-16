export const VIEW_MODES = [
  {
    id: 'realtime',
    label: 'RealTime',
    shortLabel: 'Live',
    icon: 'bi-broadcast',
    subtitle: '실시간 클릭 — 지금 페이지에서 무슨 일이 일어나는지 확인하세요',
  },
  {
    id: 'ux',
    label: 'UX Heatmap',
    shortLabel: 'UX',
    icon: 'bi-mouse',
    subtitle: '기간별 클릭 분포 — 어디를 많이 누르는지 분석합니다',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    shortLabel: '분석',
    icon: 'bi-bar-chart-line',
    subtitle: 'UV·PV·체류·퍼널 — 방문자 행동을 숫자로 분석합니다',
  },
  {
    id: 'ab',
    label: 'A/B Test',
    shortLabel: 'A/B',
    icon: 'bi-shuffle',
    subtitle: '실험 생성·배정·variant별 전환·히트맵 비교',
  },
  {
    id: 'path',
    label: 'Path Plot',
    shortLabel: '경로',
    icon: 'bi-signpost-split',
    subtitle: '클릭 경로 — 사용자가 어떤 순서로 탐색하는지 봅니다',
  },
];

export function getModeMeta(modeId) {
  return VIEW_MODES.find((m) => m.id === modeId) ?? VIEW_MODES[0];
}

export default function ViewModeTabs({ mode, onChange }) {
  return (
    <nav className="mode-tabs-nav" aria-label="대시보드 모드">
      <ul className="nav nav-pills mode-tabs flex-nowrap">
        {VIEW_MODES.map((m) => (
          <li className="nav-item" key={m.id}>
            <button
              type="button"
              className={`nav-link d-flex align-items-center gap-2${mode === m.id ? ' active' : ''}`}
              onClick={() => onChange(m.id)}
              title={m.subtitle}
            >
              <i className={`bi ${m.icon}`} aria-hidden="true" />
              <span className="mode-tab-label d-none d-sm-inline">{m.label}</span>
              <span className="mode-tab-label d-inline d-sm-none">{m.shortLabel}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
