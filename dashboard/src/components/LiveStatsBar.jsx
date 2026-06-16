export default function LiveStatsBar({
  connected,
  minuteClicks,
  activeSessions,
  activeVisitors,
  windowClicks,
  windowLabel,
  historical,
}) {
  return (
    <div className="live-stats-bar">
      <div className="live-indicator">
        <span className={`live-dot${connected ? ' on' : ''}`} />
        <strong>{historical ? '기간 조회' : connected ? 'LIVE' : '연결 중…'}</strong>
      </div>
      <div className="live-stat">
        <span className="label">최근 1분</span>
        <span className="value">{minuteClicks}클릭</span>
      </div>
      <div className="live-stat">
        <span className="label">활성 세션</span>
        <span className="value">{activeSessions}</span>
      </div>
      <div className="live-stat">
        <span className="label">활성 UV</span>
        <span className="value">{activeVisitors}</span>
      </div>
      <div className="live-stat">
        <span className="label">{windowLabel}</span>
        <span className="value">{windowClicks}클릭</span>
      </div>
    </div>
  );
}
