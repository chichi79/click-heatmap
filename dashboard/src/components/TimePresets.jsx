export const WINDOW_PRESETS = [
  { value: 5, label: '5분' },
  { value: 15, label: '15분' },
  { value: 60, label: '1시간' },
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

export default function TimePresets({ value, onChange, disabled = false }) {
  return (
    <div
      className={`filter-chips${disabled ? ' filter-chips-disabled' : ''}`}
      role="group"
      aria-label="시간 범위"
    >
      {WINDOW_PRESETS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`filter-chip${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
