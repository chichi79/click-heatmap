import { useEffect, useState } from 'react';

function formatAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 5) return '방금';
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}

export default function ClickFeed({ items }) {
  const [, tick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!items.length) {
    return <div className="click-feed-empty">아직 클릭이 없습니다. 데모 페이지에서 클릭해 보세요.</div>;
  }

  return (
    <ul className="click-feed">
      {items.map((item) => (
        <li key={item._key || `${item.ts}-${item.x}`} className="click-feed-item">
          <div className="feed-row-top">
            <span className="feed-time">{formatAgo(item.ts)}</span>
            {item.deviceType && (
              <span className="feed-device">{item.deviceType}</span>
            )}
          </div>
          <div className="feed-row-main">
            {item.tagName && <code className="feed-tag">{item.tagName}</code>}
            <span className="feed-coords">
              ({item.x?.toFixed?.(1) ?? item.x}%, {item.y?.toFixed?.(1) ?? item.y}%)
            </span>
          </div>
          <div className="feed-row-text" title={item.selector}>
            {item.elementText || item.selector || '-'}
          </div>
        </li>
      ))}
    </ul>
  );
}
