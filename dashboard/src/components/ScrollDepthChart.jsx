import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function ScrollDepthChart({ data, total }) {
  const hasData = total > 0;

  return (
    <div>
      <p className="text-muted small mb-2">
        스크롤 깊이별 도달 세션 비율 (총 {total}개 세션)
      </p>
      {!hasData ? (
        <div className="chart-empty">스크롤 데이터가 없습니다</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="depth" tickFormatter={(v) => `${v}%`} />
            <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              formatter={(value, name) =>
                name === 'pct' ? [`${value}%`, '도달 비율'] : [value, '세션 수']
              }
              labelFormatter={(v) => `${v}% 지점`}
            />
            <Area
              type="monotone"
              dataKey="pct"
              stroke="#7c3aed"
              fill="#7c3aed"
              fillOpacity={0.25}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
