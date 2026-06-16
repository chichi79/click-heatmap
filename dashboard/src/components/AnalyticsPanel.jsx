const METRIC_LABELS = {
  clicks: '클릭',
  sessions: '세션',
  uv: 'UV',
  pageviews: 'PV',
};

const METRIC_ACCENTS = {
  PV: 'accent-blue',
  UV: 'accent-indigo',
  세션: 'accent-violet',
  클릭: 'accent-rose',
  스크롤: 'accent-teal',
  '평균 체류': 'accent-amber',
  이탈률: 'accent-slate',
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
    return <div className="empty-state">분석 데이터를 불러오는 중…</div>;
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
      <div className="row row-cols-2 row-cols-sm-3 row-cols-xl-4 g-3 mb-4">
        {cards.map((c) => (
          <div className="col" key={c.label}>
            <div className={`stat-card ${METRIC_ACCENTS[c.label] ?? ''}`}>
              <div className="stat-card-label">{c.label}</div>
              <div className="stat-card-value">{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {data.dailyUv?.length > 0 && (
        <div>
          <h3 className="h6 fw-semibold mb-3">일별 UV</h3>
          <div className="table-responsive border rounded">
            <table className="table table-sm table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>날짜</th>
                  <th className="text-end">UV</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyUv.map((d) => (
                  <tr key={d.day}>
                    <td className="text-muted">{d.day}</td>
                    <td className="text-end fw-semibold">{d.uv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
