export default function FunnelPanel({ data, steps, onStepsChange, onAnalyze }) {
  return (
    <div>
      <div className="mb-4">
        <label htmlFor="funnel-steps" className="form-label small text-muted">
          퍼널 단계 (쉼표로 구분)
        </label>
        <div className="input-group input-group-sm">
          <input
            id="funnel-steps"
            type="text"
            className="form-control"
            value={steps}
            onChange={(e) => onStepsChange(e.target.value)}
            placeholder="/,/products,/checkout"
          />
          <button type="button" className="btn btn-primary" onClick={onAnalyze}>
            분석
          </button>
        </div>
      </div>

      {!data && (
        <div className="text-center text-muted py-4 small">
          퍼널 단계를 입력하고 분석을 누르세요.
        </div>
      )}

      {data && (
        <>
          <p className="text-muted small mb-3">
            분석 세션 {data.totalSessions} · 진입 {data.entered}
          </p>
          <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
            {data.steps.map((step, i) => (
              <li key={step.step}>
                <div className="d-flex align-items-center gap-2 mb-1 small">
                  <span className="funnel-step-num">{i + 1}</span>
                  <code className="flex-grow-1 text-truncate">{step.label}</code>
                  <strong>{step.count}</strong>
                  <span className="text-muted">{step.pct}%</span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${step.pct}%` }}
                    aria-valuenow={step.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
