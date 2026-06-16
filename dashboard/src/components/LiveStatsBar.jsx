export default function LiveStatsBar({
  connected,
  minuteClicks,
  activeSessions,
  activeVisitors,
  windowClicks,
  windowLabel,
  historical,
}) {
  const statusClass = historical
    ? 'text-bg-secondary'
    : connected
      ? 'text-bg-success'
      : 'text-bg-warning';

  const statusLabel = historical ? '기간 조회' : connected ? 'LIVE' : '연결 중';

  return (
    <div className="live-stats-bar" role="status" aria-live="polite">
      <span className={`badge rounded-pill live-status ${statusClass}`}>
        {!historical && connected && <span className="live-pulse" aria-hidden="true" />}
        {statusLabel}
      </span>
      <Stat label="최근 1분" value={minuteClicks} unit="클릭" />
      <Stat label="활성 세션" value={activeSessions} />
      <Stat label="활성 UV" value={activeVisitors} />
      <Stat label={windowLabel} value={windowClicks} unit="클릭" highlight />
    </div>
  );
}

function Stat({ label, value, unit, highlight }) {
  return (
    <div className={`live-stat${highlight ? ' live-stat-highlight' : ''}`}>
      <span className="live-stat-label">{label}</span>
      <span className="live-stat-value">
        {value}
        {unit && <span className="live-stat-unit">{unit}</span>}
      </span>
    </div>
  );
}
