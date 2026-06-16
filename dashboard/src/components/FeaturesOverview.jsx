const SECTIONS = [
  {
    id: 'clicks',
    mode: 'ux',
    visual: 'heatmap',
    title: '클릭·인터랙션 지표',
    lead: '관심이 실제 선택까지 이어졌을까요?',
    body: '스크린샷 위 히트맵과 요소별 클릭 랭킹으로 어디를 가장 많이 누르는지 확인하세요. RealTime 탭에서는 지금 일어나는 클릭을 라이브로 볼 수 있습니다.',
    cta: 'UX Heatmap',
  },
  {
    id: 'scroll',
    mode: 'ux',
    visual: 'scroll',
    title: '페이지 효율을 한눈에',
    lead: '상·하단까지 얼마나 읽었을까요?',
    body: '스크롤 깊이별 도달 세션 비율로 하단 콘텐츠 노출과 이탈 지점을 파악합니다. 콘텐츠 배치와 개선 우선순위를 정하는 데 활용하세요.',
    cta: '스크롤 깊이 보기',
  },
  {
    id: 'analytics',
    mode: 'analytics',
    visual: 'analytics',
    title: '고객을 이해할 수 있는 데이터',
    lead: '이탈·체류·전환을 숫자로',
    body: 'UV, PV, 세션, 평균 체류, 이탈률과 URL 퍼널을 한곳에서 요약합니다. 일별 UV 추이로 방문 트렌드도 함께 살펴보세요.',
    cta: 'Analytics',
  },
  {
    id: 'journey',
    mode: 'path',
    visual: 'path',
    title: '경로와 실험',
    lead: '클릭 순서와 variant 비교',
    body: 'Path Plot으로 페이지 내 클릭 여정을, A/B Test로 variant별 클릭·전환 차이를 검증합니다. 인기 경로와 실험 결과로 개선 가설을 테스트하세요.',
    cta: 'Path Plot',
  },
];

function FeatureVisual({ type }) {
  if (type === 'heatmap') {
    return (
      <div className="features-mock features-mock-heatmap" aria-hidden="true">
        <div className="features-mock-browser">
          <span /><span /><span />
        </div>
        <div className="features-mock-page">
          <div className="features-mock-block wide" />
          <div className="features-mock-block" />
          <div className="features-mock-dots">
            <span className="hot" style={{ top: '38%', left: '62%' }} />
            <span className="warm" style={{ top: '52%', left: '28%' }} />
            <span className="hot" style={{ top: '68%', left: '48%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'scroll') {
    return (
      <div className="features-mock features-mock-scroll" aria-hidden="true">
        {[100, 88, 72, 58, 42, 28].map((pct) => (
          <div key={pct} className="features-mock-scroll-row">
            <span className="features-mock-scroll-label">{pct}%</span>
            <div className="features-mock-scroll-bar">
              <div className="features-mock-scroll-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'analytics') {
    return (
      <div className="features-mock features-mock-analytics" aria-hidden="true">
        <div className="features-mock-stat">
          <span className="label">UV</span>
          <span className="value">1,248</span>
        </div>
        <div className="features-mock-stat">
          <span className="label">체류</span>
          <span className="value">2m 14s</span>
        </div>
        <div className="features-mock-stat">
          <span className="label">이탈</span>
          <span className="value">34%</span>
        </div>
        <div className="features-mock-chart">
          {[40, 65, 55, 80, 70, 90, 75].map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="features-mock features-mock-path" aria-hidden="true">
      <div className="features-mock-path-flow">
        <span>로그인</span>
        <i className="bi bi-arrow-right" />
        <span>메뉴</span>
        <i className="bi bi-arrow-right" />
        <span>상세</span>
      </div>
      <div className="features-mock-path-ab">
        <div className="variant a">A · 52%</div>
        <div className="variant b">B · 48%</div>
      </div>
    </div>
  );
}

function FeatureBlock({ section, reverse, onNavigate }) {
  return (
    <section className={`features-block${reverse ? ' features-block--reverse' : ''}`}>
      <div className="features-block-visual">
        <FeatureVisual type={section.visual} />
      </div>
      <div className="features-block-copy">
        <h3 className="features-block-title">{section.title}</h3>
        <p className="features-block-lead">{section.lead}</p>
        <p className="features-block-body">{section.body}</p>
        <button type="button" className="btn btn-link features-block-link px-0" onClick={() => onNavigate(section.mode)}>
          {section.cta}
          <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export default function FeaturesOverview({ onNavigate }) {
  return (
    <div className="features-overview">
      <header className="features-page-hero text-center">
        <h2 className="features-page-title">Click Heatmap</h2>
        <p className="features-page-subtitle">
          클릭·스크롤·방문 데이터를 수집하고, 해석에 필요한 지표만 요약해 제공합니다.
          <br className="d-none d-md-inline" />
          보고용 정리 시간을 줄이고 페이지 개선에 집중하세요.
        </p>
      </header>

      <div className="features-blocks">
        {SECTIONS.map((section, i) => (
          <FeatureBlock key={section.id} section={section} reverse={i % 2 === 1} onNavigate={onNavigate} />
        ))}
      </div>

      <footer className="features-page-cta card dashboard-card border-0 shadow-sm text-center">
        <div className="card-body py-4 px-3 px-md-5">
          <p className="features-cta-lead mb-3">
            한 줄의 코드로 클릭·스크롤·방문을 수집하세요.
          </p>
          <code className="features-sdk-code d-inline-block mb-3">
            {'<script src="https://click-heatmap.onrender.com/heatmap-sdk.js" defer></script>'}
          </code>
          <div>
            <button type="button" className="btn btn-primary px-4" onClick={() => onNavigate('realtime')}>
              분석 시작하기
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
