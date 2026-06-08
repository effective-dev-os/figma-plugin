import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { WireMessage, JoinMessage } from '@figma-agent/shared/wire';
import {
  handleJoin,
  handleRequest,
  handleResponse,
  handleProgress,
  handleDisconnect,
  getRouterStats,
} from './router.js';
import { startHeartbeat } from './heartbeat.js';
import { log } from './log.js';

export interface RelayServerOptions {
  port?: number;
  host?: string;
}

export interface ServerStats {
  uptime: number;
  connectedClients: number;
  channelCount: number;
  pendingRequests: number;
}

let clientCounter = 0;

function makeClientId(): string {
  return `c${(++clientCounter).toString(36)}_${Date.now().toString(36)}`;
}

export interface RelayServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStats(): ServerStats;
}

export function createRelayServer(opts: RelayServerOptions = {}): RelayServer {
  const port = opts.port ?? 3055;
  const host = opts.host ?? '127.0.0.1';

  let wss: WebSocketServer | null = null;
  const startedAt = Date.now();
  let connectedClients = 0;

  function getStats(): ServerStats {
    const router = getRouterStats();
    return {
      uptime: Date.now() - startedAt,
      connectedClients,
      ...router,
    };
  }

  function attachClientHandlers(ws: WebSocket, _req: IncomingMessage): void {
    const clientId = makeClientId();
    connectedClients++;
    log.info('client connected', { clientId });

    let joined = false;

    const heartbeat = startHeartbeat(ws, clientId, () => {
      handleDisconnect(clientId);
      connectedClients--;
    });

    ws.on('message', (raw) => {
      let msg: WireMessage;

      try {
        msg = JSON.parse(raw.toString()) as WireMessage;
      } catch {
        log.warn('unparseable message, ignoring', { clientId });
        return;
      }

      switch (msg.type) {
        case 'join': {
          const join = msg as JoinMessage;
          handleJoin(ws, clientId, join.channelId, join.role);
          joined = true;
          break;
        }
        case 'request': {
          if (!joined) {
            log.warn('request before join, ignoring', { clientId });
            return;
          }
          handleRequest(ws, clientId, msg);
          break;
        }
        case 'response': {
          if (!joined) return;
          handleResponse(ws, clientId, msg);
          break;
        }
        case 'progress': {
          if (!joined) return;
          handleProgress(ws, clientId, msg);
          break;
        }
        case 'pong':
          // handled by ws lib via pong event in heartbeat
          break;
        case 'ping':
          // client-initiated pings — ignore; relay manages heartbeat from its side
          break;
        default:
          // join_ack / join_error are server → client only; anything else ignored
          break;
      }
    });

    ws.on('close', (code, reason) => {
      heartbeat.stop();
      handleDisconnect(clientId);
      connectedClients--;
      const reasonStr = reason.toString().slice(0, 64);
      log.info('client disconnected', reasonStr
        ? { clientId, code, reason: reasonStr }
        : { clientId, code });
    });

    ws.on('error', (err) => {
      log.error('client socket error', { clientId, reason: err.message.slice(0, 128) });
    });
  }

  async function start(): Promise<void> {
    return new Promise((resolve, reject) => {
      wss = new WebSocketServer({ host, port });

      wss.on('connection', attachClientHandlers);

      wss.on('error', (err) => {
        log.error('server error', { reason: err.message });
      });

      wss.on('listening', () => {
        log.info('relay listening', { host, port });
        resolve();
      });

      wss.on('error', reject);
    });
  }

  async function stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!wss) {
        resolve();
        return;
      }
      wss.close(() => {
        log.info('relay stopped');
        resolve();
      });
      // Terminate lingering connections so close() callback fires promptly
      for (const client of wss.clients) {
        client.terminate();
      }
    });
  }

  return { start, stop, getStats };
}
