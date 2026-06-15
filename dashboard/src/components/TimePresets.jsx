export const WINDOW_PRESETS = [
  { value: 5, label: '최근 5분' },
  { value: 15, label: '최근 15분' },
  { value: 60, label: '최근 1시간' },
  { value: 'today', label: '오늘' },
];

export function presetToMinutes(preset) {
  if (preset === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Math.max(1, Math.ceil((Date.now() - start.getTime()) / 60000));
  }
  return Number(preset);
}

export default function TimePresets({ value, onChange }) {
  return (
    <div className="time-presets">
      {WINDOW_PRESETS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
