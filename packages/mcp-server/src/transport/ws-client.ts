import WebSocket from 'ws';
import { logError, logInfo } from '../log.js';
import { createInactivityTimer } from './timeout.js';
import type {
  JoinMessage,
  JoinAckMessage,
  RequestMessage,
  ResponseMessage,
  ProgressMessage,
  WireMessage,
} from '@figma-agent/shared/wire';

const DEFAULT_TIMEOUT_MS = Number(process.env['WS_TIMEOUT_MS'] ?? '60000');
const DEFAULT_RELAY_PORT = Number(process.env['RELAY_PORT'] ?? '3055');

// Exponential backoff: 1s → 2s → 4s → 8s → 30s cap
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof createInactivityTimer>;
}

export interface WsClientOptions {
  relayPort?: number;
  relayHost?: string;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private readonly sessionId: string = crypto.randomUUID();
  private readonly channelId: string;
  private readonly relayUrl: string;
  private reconnectAttempt = 0;
  private closing = false;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(channelId: string, opts: WsClientOptions = {}) {
    this.channelId = channelId;
    const host = opts.relayHost ?? '127.0.0.1';
    const port = opts.relayPort ?? DEFAULT_RELAY_PORT;
    this.relayUrl = `ws://${host}:${port}`;
  }

  connect(): void {
    if (this.closing) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    logInfo(`WsClient connecting to relay ${this.relayUrl} (attempt ${this.reconnectAttempt + 1})`);

    const socket = new WebSocket(this.relayUrl);
    this.ws = socket;

    const connTimeout = setTimeout(() => {
      if (socket.readyState === WebSocket.CONNECTING) {
        logError('WsClient connection timeout — terminating');
        socket.terminate();
      }
    }, 10_000);

    socket.on('open', () => {
      clearTimeout(connTimeout);
      this.reconnectAttempt = 0;
      logInfo('WsClient connected to relay');
      this.sendJoin();
    });

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as WireMessage;
        this.handleMessage(msg);
      } catch (e) {
        logError(`WsClient message parse error: ${e instanceof Error ? e.message : String(e)}`);
      }
    });

    socket.on('error', (err) => {
      logError(`WsClient socket error: ${err.message}`);
    });

    socket.on('close', (code) => {
      clearTimeout(connTimeout);
      logInfo(`WsClient disconnected (code=${code})`);
      this.ws = null;

      for (const [id, req] of this.pending) {
        req.timer.clear();
        req.reject(new Error(`WS connection closed (code=${code})`));
        this.pending.delete(id);
      }

      if (!this.closing) {
        this.scheduleReconnect();
      }
    });
  }

  private sendJoin(): void {
    const msg: JoinMessage = { type: 'join', channelId: this.channelId, role: 'mcp' };
    this.ws?.send(JSON.stringify(msg));
  }

  private handleMessage(msg: WireMessage): void {
    if (msg.type === 'join_ack') {
      const ack = msg as JoinAckMessage;
      logInfo(`WsClient joined channel ${ack.channelId}, peerConnected=${ack.peerConnected}`);
      return;
    }

    if (msg.type === 'join_error') {
      logError(`WsClient join error: ${msg.reason}`);
      return;
    }

    if (msg.type === 'pong') {
      return;
    }

    if (msg.type === 'progress') {
      const prog = msg as ProgressMessage;
      const req = this.pending.get(prog.id);
      if (req) {
        req.timer.reset();
      }
      return;
    }

    if (msg.type === 'response') {
      const resp = msg as ResponseMessage;
      const req = this.pending.get(resp.id);
      if (!req) return;
      req.timer.clear();
      this.pending.delete(resp.id);
      if (resp.ok) {
        req.resolve(resp.result);
      } else {
        req.reject(new Error(resp.error?.message ?? 'Plugin returned error'));
      }
    }
  }

  request(method: string, params: Record<string, unknown> = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WsClient: not connected to relay'));
        return;
      }

      const id = crypto.randomUUID();
      const timer = createInactivityTimer(timeoutMs, () => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Request ${method} timed out after ${timeoutMs}ms of inactivity`));
        }
      });

      this.pending.set(id, { resolve, reject, timer });

      const msg: RequestMessage = { type: 'request', id, method, params };
      this.ws.send(JSON.stringify(msg));
    });
  }

  close(): void {
    this.closing = true;
    for (const [id, req] of this.pending) {
      req.timer.clear();
      req.reject(new Error('WsClient closed'));
      this.pending.delete(id);
    }
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect(): void {
    const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * Math.pow(2, this.reconnectAttempt));
    this.reconnectAttempt++;
    logInfo(`WsClient reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
    setTimeout(() => this.connect(), delay);
  }
}
