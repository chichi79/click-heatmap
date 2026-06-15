import { WebSocketServer } from 'ws';

let wss = null;

export function setupLiveServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws/live' });

  wss.on('connection', (ws) => {
    ws.subscribedPath = null;
    ws.deviceType = 'all';

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe') {
          ws.subscribedPath = msg.path ?? null;
          ws.deviceType = msg.deviceType ?? 'all';
        }
      } catch {
        /* ignore malformed messages */
      }
    });
  });

  return wss;
}

export function broadcastClick(event) {
  if (!wss || event.type !== 'click') return;

  const payload = JSON.stringify({
    type: 'click',
    path: event.path,
    x: event.x,
    y: event.y,
    selector: event.selector,
    tagName: event.tagName,
    elementText: event.elementText,
    deviceType: event.deviceType,
    ts: event.ts,
    session: event.session,
  });

  for (const client of wss.clients) {
    if (client.readyState !== 1) continue;
    if (client.subscribedPath && client.subscribedPath !== event.path) continue;
    if (
      client.deviceType !== 'all' &&
      event.deviceType &&
      client.deviceType !== event.deviceType
    ) {
      continue;
    }
    client.send(payload);
  }
}
