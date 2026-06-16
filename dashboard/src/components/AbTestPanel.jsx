import { useState } from 'react';

function VariantBar({ label, data, isBaseline }) {
  return (
    <div className="ab-variant-card">
      <div className="ab-variant-header">
        <span className="ab-variant-badge">{label}</span>
        {isBaseline && <span className="ab-baseline-tag">기준</span>}
        {!isBaseline && data.uplift != null && (
          <span className={`ab-uplift${data.uplift >= 0 ? ' positive' : ' negative'}`}>
            {data.uplift >= 0 ? '+' : ''}
            {data.uplift}%
          </span>
        )}
      </div>
      <div className="ab-variant-stats">
        <div>
          <span>PV</span>
          <strong>{data.pageviews}</strong>
        </div>
        <div>
          <span>UV</span>
          <strong>{data.uv}</strong>
        </div>
        <div>
          <span>클릭</span>
          <strong>{data.clicks}</strong>
        </div>
        <div>
          <span>전환</span>
          <strong>{data.conversions}</strong>
        </div>
        <div>
          <span>전환율</span>
          <strong>{data.conversionRate}%</strong>
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
    <div className="ab-test-panel">
      <div className="card">
        <h2>새 A/B 실험</h2>
        <form className="ab-form" onSubmit={handleCreate}>
          <div className="ab-form-row">
            <label>
              실험 이름
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              path
              <input value={path} onChange={(e) => setPath(e.target.value)} required placeholder="/" />
            </label>
          </div>
          <div className="ab-form-row">
            <label>
              A 트래픽 비율 (%)
              <input
                type="number"
                min={10}
                max={90}
                value={splitA}
                onChange={(e) => setSplitA(e.target.value)}
              />
            </label>
            <label>
              전환 목표 selector (선택)
              <input
                value={goalSelector}
                onChange={(e) => setGoalSelector(e.target.value)}
                placeholder="#signup-btn"
              />
            </label>
          </div>
          {error && <p className="ab-error">{error}</p>}
          <button type="submit" className="ab-submit-btn" disabled={saving}>
            {saving ? '생성 중…' : '실험 시작'}
          </button>
        </form>
        <p className="ab-hint">
          팀 코드에서 variant 적용:{' '}
          <code>{`if (window.__heatmap?.getVariant() === 'B') { ... }`}</code>
        </p>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>실험 목록</h2>
        {experiments.length === 0 && (
          <p className="analytics-empty">진행 중인 실험이 없습니다.</p>
        )}
        <ul className="ab-experiment-list">
          {experiments.map((exp) => (
            <li key={exp.id} className={selectedExperimentId === exp.id ? 'active' : ''}>
              <button type="button" className="ab-exp-select" onClick={() => onSelectExperiment(exp.id)}>
                <strong>{exp.name}</strong>
                <span>
                  {exp.path} · {exp.status === 'active' ? '진행 중' : '일시정지'}
                </span>
              </button>
              <button
                type="button"
                className="ab-exp-toggle"
                onClick={() => onToggleStatus(exp.id, exp.status === 'active' ? 'paused' : 'active')}
              >
                {exp.status === 'active' ? '일시정지' : '재개'}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {results && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2>
            결과 · {results.experiment.name}
            <span className="ab-result-path">{results.experiment.path}</span>
          </h2>
          {results.experiment.goalSelector && (
            <p className="ab-goal">
              전환 목표: <code>{results.experiment.goalSelector}</code>
            </p>
          )}
          <div className="ab-variants-grid">
            {results.variants.map((v, i) => (
              <div key={v.variant}>
                <VariantBar label={`Variant ${v.variant}`} data={v} isBaseline={i === 0} />
                <button
                  type="button"
                  className="ab-heatmap-link"
                  onClick={() => onViewHeatmap(results.experiment.path, v.variant)}
                >
                  {v.variant} 히트맵 보기
                </button>
              </div>
            ))}
          </div>
          {(from || to) && (
            <p className="ab-period-note">선택한 기간 필터가 적용된 결과입니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
