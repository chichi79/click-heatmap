export default function ElementClickRanking({ elements }) {
  if (!elements.length) {
    return <div className="text-center text-muted py-4 small">클릭 요소 데이터가 없습니다</div>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-sm table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>태그</th>
            <th>선택자</th>
            <th>텍스트</th>
            <th className="text-end">클릭 수</th>
          </tr>
        </thead>
        <tbody>
          {elements.map((el, i) => (
            <tr key={`${el.selector}-${i}`}>
              <td className="text-muted">{i + 1}</td>
              <td>
                <code className="small">{el.tagName || '-'}</code>
              </td>
              <td className="selector-cell" title={el.selector}>
                <code className="small text-break">{el.selector}</code>
              </td>
              <td className="text-cell text-muted small" title={el.elementText}>
                {el.elementText || '-'}
              </td>
              <td className="text-end fw-semibold text-primary">{el.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
