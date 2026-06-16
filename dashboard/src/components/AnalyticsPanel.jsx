const METRIC_LABELS = {
  clicks: '클릭',
  sessions: '세션',
  uv: 'UV',
  pageviews: 'PV',
};

export function pathMetricLabel(metric) {
  return METRIC_LABELS[metric] ?? '클릭';
}

export function pathMetricValue(row, metric) {
  if (!row) return 0;
  if (row[metric] != null) return row[metric];
  if (metric === 'clicks' && row.count != null) return row.count;
  return 0;
}

export default function AnalyticsPanel({ data }) {
  if (!data) {
    return <div className="analytics-empty">분석 데이터를 불러오는 중…</div>;
  }

  const cards = [
    { label: 'PV', value: data.pageviews },
    { label: 'UV', value: data.uv },
    { label: '세션', value: data.sessions },
    { label: '클릭', value: data.clicks },
    { label: '스크롤', value: data.scrolls },
    { label: '평균 체류', value: `${Math.round(data.avgDwellMs / 1000)}초` },
    { label: '이탈률', value: `${data.bounceRate}%` },
  ];

  return (
    <div className="analytics-panel">
      <div className="analytics-cards">
        {cards.map((c) => (
          <div key={c.label} className="analytics-card">
            <span className="analytics-card-label">{c.label}</span>
            <strong className="analytics-card-value">{c.value}</strong>
          </div>
        ))}
      </div>

      {data.dailyUv?.length > 0 && (
        <div className="analytics-daily">
          <h3>일별 UV</h3>
          <ul className="daily-uv-list">
            {data.dailyUv.map((d) => (
              <li key={d.day}>
                <span>{d.day}</span>
                <strong>{d.uv}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
