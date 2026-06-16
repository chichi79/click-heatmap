import { useState } from 'react';

function VariantBar({ label, data, isBaseline }) {
  return (
    <div className="card h-100 border bg-light-subtle">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-3">
          <span className="fw-semibold">{label}</span>
          {isBaseline && <span className="badge text-bg-secondary">기준</span>}
          {!isBaseline && data.uplift != null && (
            <span className={`badge ${data.uplift >= 0 ? 'text-bg-success' : 'text-bg-danger'}`}>
              {data.uplift >= 0 ? '+' : ''}
              {data.uplift}%
            </span>
          )}
        </div>
        <div className="row row-cols-3 g-2 small">
          {[
            ['PV', data.pageviews],
            ['UV', data.uv],
            ['클릭', data.clicks],
            ['전환', data.conversions],
            ['전환율', `${data.conversionRate}%`],
          ].map(([k, v]) => (
            <div className="col" key={k}>
              <div className="text-muted">{k}</div>
              <div className="fw-semibold">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AbTestPanel({
  experiments,
  results,
  selectedExperimentId,
  onSelectExperiment,
  onCreate,
  onToggleStatus,
  onViewHeatmap,
  from,
  to,
}) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('/');
  const [goalSelector, setGoalSelector] = useState('');
  const [splitA, setSplitA] = useState(50);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onCreate({
        name,
        path,
        variants: ['A', 'B'],
        split: { A: Number(splitA), B: 100 - Number(splitA) },
        goalSelector: goalSelector || null,
      });
      setName('');
      setGoalSelector('');
    } catch (err) {
      setError(err.message || '실험 생성 실패');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4">
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
          <h2 className="h6 mb-0 fw-semibold">새 A/B 실험</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleCreate}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small text-muted">실험 이름</label>
                <input
                  className="form-control form-control-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small text-muted">path</label>
                <input
                  className="form-control form-control-sm"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  required
                  placeholder="/"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small text-muted">A 트래픽 비율 (%)</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  min={10}
                  max={90}
                  value={splitA}
                  onChange={(e) => setSplitA(e.target.value)}
                />
              </div>
              <div className="col-md-8">
                <label className="form-label small text-muted">전환 목표 selector (선택)</label>
                <input
                  className="form-control form-control-sm"
                  value={goalSelector}
                  onChange={(e) => setGoalSelector(e.target.value)}
                  placeholder="#signup-btn"
                />
              </div>
            </div>
            {error && <p className="text-danger small mt-2 mb-0">{error}</p>}
            <button type="submit" className="btn btn-primary btn-sm mt-3" disabled={saving}>
              {saving ? '생성 중…' : '실험 시작'}
            </button>
          </form>
          <p className="text-muted small mt-3 mb-0">
            팀 코드에서 variant 적용:{' '}
            <code className="small">{`if (window.__heatmap?.getVariant() === 'B') { ... }`}</code>
          </p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
          <h2 className="h6 mb-0 fw-semibold">실험 목록</h2>
        </div>
        <div className="card-body pt-2">
          {experiments.length === 0 && (
            <p className="text-center text-muted py-4 small mb-0">진행 중인 실험이 없습니다.</p>
          )}
          <div className="list-group list-group-flush">
            {experiments.map((exp) => (
              <div
                key={exp.id}
                className={`list-group-item d-flex align-items-center gap-2 px-0${
                  selectedExperimentId === exp.id ? ' list-group-item-primary' : ''
                }`}
              >
                <button
                  type="button"
                  className="btn btn-link text-start text-decoration-none flex-grow-1 p-0"
                  onClick={() => onSelectExperiment(exp.id)}
                >
                  <div className="fw-semibold text-body">{exp.name}</div>
                  <div className="small text-muted">
                    {exp.path} · {exp.status === 'active' ? '진행 중' : '일시정지'}
                  </div>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm flex-shrink-0"
                  onClick={() => onToggleStatus(exp.id, exp.status === 'active' ? 'paused' : 'active')}
                >
                  {exp.status === 'active' ? '일시정지' : '재개'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {results && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
            <h2 className="h6 mb-1 fw-semibold">
              결과 · {results.experiment.name}
              <span className="text-muted fw-normal ms-2 small">{results.experiment.path}</span>
            </h2>
            {results.experiment.goalSelector && (
              <p className="small text-muted mb-0">
                전환 목표: <code>{results.experiment.goalSelector}</code>
              </p>
            )}
          </div>
          <div className="card-body">
            <div className="row g-3">
              {results.variants.map((v, i) => (
                <div className="col-md-6" key={v.variant}>
                  <VariantBar label={`Variant ${v.variant}`} data={v} isBaseline={i === 0} />
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm w-100 mt-2"
                    onClick={() => onViewHeatmap(results.experiment.path, v.variant)}
                  >
                    {v.variant} 히트맵 보기
                  </button>
                </div>
              ))}
            </div>
            {(from || to) && (
              <p className="text-muted small mt-3 mb-0">선택한 기간 필터가 적용된 결과입니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
