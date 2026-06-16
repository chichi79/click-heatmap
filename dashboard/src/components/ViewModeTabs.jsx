export const VIEW_MODES = [
  {
    id: 'ux',
    label: 'UX Heatmap',
    subtitle: '기간별 클릭 분포 — 어디를 많이 누르는지 분석합니다',
  },
  {
    id: 'realtime',
    label: 'RealTime',
    subtitle: '실시간 클릭 — 지금 페이지에서 무슨 일이 일어나는지 확인하세요',
  },
  {
    id: 'ab',
    label: 'A/B Test',
    subtitle: '실험 생성·배정·variant별 전환·히트맵 비교',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    subtitle: 'UV·PV·체류·퍼널 — 방문자 행동을 숫자로 분석합니다',
  },
  {
    id: 'path',
    label: 'Path Plot',
    subtitle: '클릭 경로 — 사용자가 어떤 순서로 탐색하는지 봅니다',
  },
];

export function getModeMeta(modeId) {
  return VIEW_MODES.find((m) => m.id === modeId) ?? VIEW_MODES[0];
}

export default function ViewModeTabs({ mode, onChange }) {
  return (
    <ul className="nav nav-pills flex-nowrap gap-1 overflow-auto pb-1">
      {VIEW_MODES.map((m) => (
        <li className="nav-item" key={m.id}>
          <button
            type="button"
            className={`nav-link${mode === m.id ? ' active' : ''}`}
            onClick={() => onChange(m.id)}
            title={m.subtitle}
          >
            {m.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
