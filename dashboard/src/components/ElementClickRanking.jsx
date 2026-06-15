export default function ElementClickRanking({ elements }) {
  if (!elements.length) {
    return <div className="element-empty">클릭 요소 데이터가 없습니다</div>;
  }

  return (
    <div className="element-table-wrap">
      <table className="element-table">
        <thead>
          <tr>
            <th>#</th>
            <th>태그</th>
            <th>선택자</th>
            <th>텍스트</th>
            <th>클릭 수</th>
          </tr>
        </thead>
        <tbody>
          {elements.map((el, i) => (
            <tr key={`${el.selector}-${i}`}>
              <td>{i + 1}</td>
              <td>
                <code>{el.tagName || '-'}</code>
              </td>
              <td className="selector-cell" title={el.selector}>
                <code>{el.selector}</code>
              </td>
              <td className="text-cell" title={el.elementText}>
                {el.elementText || '-'}
              </td>
              <td className="count-cell">{el.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
