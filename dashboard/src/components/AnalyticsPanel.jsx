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
    return <div className="text-center text-muted py-4 small">분석 데이터를 불러오는 중…</div>;
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
    <div>
      <div className="row row-cols-2 row-cols-sm-3 row-cols-lg-4 g-3 mb-4">
        {cards.map((c) => (
          <div className="col" key={c.label}>
            <div className="card h-100 border bg-light-subtle">
              <div className="card-body py-3">
                <div className="small text-muted mb-1">{c.label}</div>
                <div className="fs-5 fw-semibold">{c.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.dailyUv?.length > 0 && (
        <div>
          <h3 className="h6 fw-semibold mb-3">일별 UV</h3>
          <ul className="list-group list-group-flush border rounded">
            {data.dailyUv.map((d) => (
              <li
                key={d.day}
                className="list-group-item d-flex justify-content-between align-items-center py-2"
              >
                <span className="text-muted small">{d.day}</span>
                <strong>{d.uv}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
