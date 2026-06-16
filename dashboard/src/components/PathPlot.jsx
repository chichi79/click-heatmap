function StepChip({ step, index }) {
  return (
    <div className="path-step" title={step.selector}>
      <span className="path-step-num">{index + 1}</span>
      <code className="path-step-tag">{step.tagName || '?'}</code>
      <span className="path-step-label">{step.label}</span>
    </div>
  );
}

function PathFlow({ steps }) {
  return (
    <div className="path-flow">
      {steps.map((step, i) => (
        <div key={`${step.selector}-${i}`} className="path-flow-item">
          {i > 0 && <span className="path-arrow" aria-hidden="true">→</span>}
          <StepChip step={step} index={i} />
        </div>
      ))}
    </div>
  );
}

export default function PathPlot({ data }) {
  if (!data || data.totalSessions === 0) {
    return (
      <div className="empty-state">
        분석할 클릭 경로가 없습니다. 같은 페이지에서 2회 이상 클릭한 세션이 필요합니다.
      </div>
    );
  }

  return (
    <div className="path-plot">
      <p className="text-muted small mb-4">
        {data.totalSessions}개 세션 · {data.totalClicks}건 클릭 분석
      </p>

      <section className="path-section mb-4">
        <h3 className="h6 fw-semibold mb-3">인기 클릭 경로 Top {data.paths.length}</h3>
        <ul className="path-ranking">
          {data.paths.map((path) => (
            <li key={path.rank} className="path-ranking-item">
              <div className="path-ranking-head">
                <span className="path-rank">#{path.rank}</span>
                <span className="path-count">
                  {path.count}세션 ({path.pct}%)
                </span>
              </div>
              <PathFlow steps={path.steps} />
            </li>
          ))}
        </ul>
      </section>

      <section className="path-section">
        <h3 className="h6 fw-semibold mb-3">최근 세션 여정</h3>
        <ul className="path-sessions">
          {data.sessions.map((s) => (
            <li key={s.session} className="path-session-item">
              <div className="path-session-meta">
                <span>{s.clickCount}클릭</span>
                <span className="path-session-id">{s.session.slice(0, 8)}…</span>
              </div>
              <PathFlow steps={s.steps} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
