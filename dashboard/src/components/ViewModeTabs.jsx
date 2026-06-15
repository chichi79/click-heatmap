export const VIEW_MODES = [
  {
    id: 'ux',
    label: 'UX Heatmap',
    subtitle: '기간별 클릭 분포 — 어디를 많이 누르는지 분석합니다',
  },
  {
    id: 'realtime',
    label: 'RealTime Heatmap',
    subtitle: '실시간 클릭 — 지금 페이지에서 무슨 일이 일어나는지 확인하세요',
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
    <div className="view-mode-tabs">
      {VIEW_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          className={mode === m.id ? 'active' : ''}
          onClick={() => onChange(m.id)}
          title={m.subtitle}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
