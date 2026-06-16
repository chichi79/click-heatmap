export default function FunnelPanel({ data, steps, onStepsChange, onAnalyze }) {
  return (
    <div className="funnel-panel">
      <div className="funnel-input-row">
        <label htmlFor="funnel-steps">퍼널 단계 (쉼표로 구분)</label>
        <input
          id="funnel-steps"
          type="text"
          value={steps}
          onChange={(e) => onStepsChange(e.target.value)}
          placeholder="/,/products,/checkout"
        />
        <button type="button" className="funnel-analyze-btn" onClick={onAnalyze}>
          분석
        </button>
      </div>

      {!data && <div className="analytics-empty">퍼널 단계를 입력하고 분석을 누르세요.</div>}

      {data && (
        <>
          <p className="funnel-meta">
            분석 세션 {data.totalSessions} · 진입 {data.entered}
          </p>
          <ul className="funnel-steps">
            {data.steps.map((step, i) => (
              <li key={step.step} className="funnel-step">
                <div className="funnel-step-header">
                  <span className="funnel-step-num">{i + 1}</span>
                  <span className="funnel-step-path">{step.label}</span>
                  <strong>{step.count}</strong>
                  <span className="funnel-step-pct">{step.pct}%</span>
                </div>
                <div className="funnel-bar-track">
                  <div className="funnel-bar-fill" style={{ width: `${step.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
