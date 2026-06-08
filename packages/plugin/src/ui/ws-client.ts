import type { WireMessage, RequestMessage, ResponseMessage } from '@figma-agent/shared';

const RELAY_URL_BASE = 'ws://localhost:3055';
const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 35_000;
const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 30_000];

type StatusCallback = (status: 'disconnected' | 'connecting' | 'connected', error?: string) => void;

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (err: Error) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private channelId = '';
  private statusCb: StatusCallback | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private pingHandle: ReturnType<typeof setInterval> | null = null;
  private pongTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private reconnectHandle: ReturnType<typeof setTimeout> | null = null;
  private backoffIdx = 0;
  private destroyed = false;
  private manualDisconnect = false;

  onStatus(cb: StatusCallback): void {
    this.statusCb = cb;
  }

  connect(channelId: string): void {
    this.channelId = channelId;
    this.manualDisconnect = false;
    this.backoffIdx = 0;
    this.openSocket();
  }

  disconnect(): void {
    this.manualDisconnect = true;
    this.destroyed = false;
    this.clearReconnect();
    this.closeSocket();
    this.emitStatus('disconnected');
  }

  destroy(): void {
    this.destroyed = true;
    this.manualDisconnect = true;
    this.clearReconnect();
    this.closeSocket();
  }

  private openSocket(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    this.emitStatus('connecting');
    const ws = new WebSocket(RELAY_URL_BASE);
    this.ws = ws;

    ws.onopen = () => {
      const joinMsg: WireMessage = { type: 'join', channelId: this.channelId, role: 'plugin' };
      ws.send(JSON.stringify(joinMsg));
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      this.handleMessage(ev.data);
    };

    ws.onclose = () => {
      this.stopHeartbeat();
      if (!this.manualDisconnect && !this.destroyed) {
        this.emitStatus('disconnected', 'Connection closed — reconnecting');
        this.scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // onclose fires after onerror; let onclose handle reconnect
    };
  }

  private handleMessage(raw: string): void {
    let msg: WireMessage;
    try {
      msg = JSON.parse(raw) as WireMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case 'join_ack':
        this.backoffIdx = 0;
        this.emitStatus('connected');
        this.startHeartbeat();
        break;

      case 'join_error':
        this.emitStatus('disconnected', `Join error: ${msg.reason}`);
        this.manualDisconnect = true;
        this.closeSocket();
        break;

      case 'ping':
        this.resetPongTimeout();
        this.send({ type: 'pong', ts: Date.now() });
        break;

      case 'pong':
        this.resetPongTimeout();
        break;

      case 'request':
        this.forwardToController(msg as RequestMessage);
        break;

      default:
        break;
    }
  }

  private forwardToController(req: RequestMessage): void {
    const controllerMsg = {
      type: 'controller_request',
      id: req.id,
      method: req.method,
      params: req.params,
    };

    const responseListener = (ev: MessageEvent) => {
      const data = (ev.data ?? {}) as { pluginMessage?: unknown };
      const pluginMsg = data.pluginMessage as Record<string, unknown> | undefined;
      if (!pluginMsg || pluginMsg['type'] !== 'controller_response') return;
      if (pluginMsg['id'] !== req.id) return;

      window.removeEventListener('message', responseListener as EventListener);

      const ok = Boolean(pluginMsg['ok']);
      const response: ResponseMessage = ok
        ? { type: 'response', id: req.id, ok: true, result: pluginMsg['result'] }
        : {
            type: 'response',
            id: req.id,
            ok: false,
            error: pluginMsg['error'] as { code: string; message: string },
          };
      this.send(response);
    };

    window.addEventListener('message', responseListener as EventListener);
    window.parent.postMessage({ pluginMessage: controllerMsg }, '*');
  }

  private send(msg: WireMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingHandle = setInterval(() => {
      this.send({ type: 'ping', ts: Date.now() });
      this.pongTimeoutHandle = setTimeout(() => {
        this.ws?.close();
      }, PONG_TIMEOUT_MS);
    }, PING_INTERVAL_MS);
  }

  private resetPongTimeout(): void {
    if (this.pongTimeoutHandle !== null) {
      clearTimeout(this.pongTimeoutHandle);
      this.pongTimeoutHandle = null;
    }
  }

  private stopHeartbeat(): void {
    if (this.pingHandle !== null) {
      clearInterval(this.pingHandle);
      this.pingHandle = null;
    }
    this.resetPongTimeout();
  }

  private scheduleReconnect(): void {
    const delay = BACKOFF_STEPS_MS[Math.min(this.backoffIdx, BACKOFF_STEPS_MS.length - 1)] ?? 30_000;
    this.backoffIdx = Math.min(this.backoffIdx + 1, BACKOFF_STEPS_MS.length - 1);
    this.reconnectHandle = setTimeout(() => {
      if (!this.manualDisconnect && !this.destroyed) {
        this.openSocket();
      }
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectHandle !== null) {
      clearTimeout(this.reconnectHandle);
      this.reconnectHandle = null;
    }
  }

  private closeSocket(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    // Reject all pending
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  private emitStatus(status: 'disconnected' | 'connecting' | 'connected', error?: string): void {
    this.statusCb?.(status, error);
  }
}

export const wsClient = new WsClient();
