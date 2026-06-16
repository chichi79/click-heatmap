export default function LiveStatsBar({
  connected,
  minuteClicks,
  activeSessions,
  activeVisitors,
  windowClicks,
  windowLabel,
  historical,
}) {
  const statusClass = historical ? 'bg-secondary' : connected ? 'bg-success' : 'bg-warning text-dark';

  return (
    <div className="card border-0 shadow-sm mb-3 bg-dark text-white">
      <div className="card-body py-3">
        <div className="d-flex flex-wrap align-items-center gap-3 gap-md-4">
          <div className="d-flex align-items-center gap-2">
            <span className={`badge rounded-pill ${statusClass}`}>
              {historical ? '기간 조회' : connected ? 'LIVE' : '연결 중…'}
            </span>
          </div>
          <Stat label="최근 1분" value={`${minuteClicks} 클릭`} />
          <Stat label="활성 세션" value={activeSessions} />
          <Stat label="활성 UV" value={activeVisitors} />
          <Stat label={windowLabel} value={`${windowClicks} 클릭`} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="small text-white-50">{label}</div>
      <div className="fw-semibold">{value}</div>
    </div>
  );
}
