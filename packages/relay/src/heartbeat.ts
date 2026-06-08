import type WebSocket from 'ws';
import { log } from './log.js';

const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 35_000;

export interface HeartbeatHandle {
  stop(): void;
}

export function startHeartbeat(
  ws: WebSocket,
  clientId: string,
  onTimeout: () => void,
): HeartbeatHandle {
  let lastPongAt = Date.now();

  ws.on('pong', () => {
    lastPongAt = Date.now();
  });

  const interval = setInterval(() => {
    if (ws.readyState !== ws.OPEN) {
      clearInterval(interval);
      return;
    }

    const elapsed = Date.now() - lastPongAt;
    if (elapsed > PONG_TIMEOUT_MS) {
      log.warn('heartbeat timeout, closing', { clientId });
      clearInterval(interval);
      ws.close(1011, 'heartbeat timeout');
      onTimeout();
      return;
    }

    try {
      ws.ping();
    } catch {
      // socket already closing
    }
  }, PING_INTERVAL_MS);

  return {
    stop() {
      clearInterval(interval);
    },
  };
}
