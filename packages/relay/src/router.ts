import type WebSocket from 'ws';
import type {
  WireMessage,
  JoinAckMessage,
  JoinErrorMessage,
  ResponseMessage,
} from '@figma-agent/shared/wire';
import { isValidChannelId, isBlockedMethod } from './validate.js';
import { log } from './log.js';

// Stale request entries are GC'd after this interval with no response.
const REQUEST_TTL_MS = 60_000;

type Role = 'plugin' | 'mcp';

interface Client {
  ws: WebSocket;
  clientId: string;
  role: Role;
}

interface Channel {
  plugin?: Client;
  mcp?: Client;
  // requestId → role of the originating client (for unicast response routing)
  requestToClient: Map<string, { role: Role; enqueuedAt: number }>;
  gcTimer: ReturnType<typeof setInterval>;
}

const channels = new Map<string, Channel>();

// clientId → channelId (for cleanup on disconnect)
const clientChannel = new Map<string, string>();

function makeChannelId(raw: string): string {
  return raw.toLowerCase();
}

function send(ws: WebSocket, msg: WireMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function getOrCreateChannel(channelId: string): Channel {
  let ch = channels.get(channelId);
  if (!ch) {
    const gcTimer = setInterval(() => {
      const now = Date.now();
      const channel = channels.get(channelId);
      if (!channel) {
        clearInterval(gcTimer);
        return;
      }
      for (const [requestId, entry] of channel.requestToClient.entries()) {
        if (now - entry.enqueuedAt > REQUEST_TTL_MS) {
          channel.requestToClient.delete(requestId);
          log.warn('GC stale request entry', { channelId, requestId: requestId.slice(0, 8) });
        }
      }
    }, REQUEST_TTL_MS);

    ch = {
      requestToClient: new Map(),
      gcTimer,
    };
    channels.set(channelId, ch);
    log.info('channel created', { channelId });
  }
  return ch;
}

function destroyChannelIfEmpty(channelId: string): void {
  const ch = channels.get(channelId);
  if (!ch) return;
  if (!ch.plugin && !ch.mcp) {
    clearInterval(ch.gcTimer);
    channels.delete(channelId);
    log.info('channel destroyed', { channelId });
  }
}

export function handleJoin(
  ws: WebSocket,
  clientId: string,
  rawChannelId: string,
  role: Role,
): void {
  const channelId = makeChannelId(rawChannelId);

  if (!isValidChannelId(channelId)) {
    const err: JoinErrorMessage = { type: 'join_error', reason: 'invalid_channel' };
    send(ws, err);
    log.warn('join rejected: invalid channel id', { clientId, role });
    return;
  }

  const ch = getOrCreateChannel(channelId);

  if (role === 'plugin' && ch.plugin) {
    const err: JoinErrorMessage = { type: 'join_error', reason: 'role_taken' };
    send(ws, err);
    log.warn('join rejected: plugin role taken', { clientId, channelId });
    return;
  }
  if (role === 'mcp' && ch.mcp) {
    const err: JoinErrorMessage = { type: 'join_error', reason: 'role_taken' };
    send(ws, err);
    log.warn('join rejected: mcp role taken', { clientId, channelId });
    return;
  }

  const client: Client = { ws, clientId, role };
  if (role === 'plugin') {
    ch.plugin = client;
  } else {
    ch.mcp = client;
  }
  clientChannel.set(clientId, channelId);

  const peerConnected = role === 'plugin' ? ch.mcp !== undefined : ch.plugin !== undefined;
  const ack: JoinAckMessage = { type: 'join_ack', channelId, peerConnected };
  send(ws, ack);
  log.info('client joined channel', { clientId, channelId, role });

  // Notify existing peer that their partner just connected.
  if (peerConnected) {
    const peer = role === 'plugin' ? ch.mcp : ch.plugin;
    if (peer) {
      const peerAck: JoinAckMessage = { type: 'join_ack', channelId, peerConnected: true };
      send(peer.ws, peerAck);
    }
  }
}

export function handleRequest(
  ws: WebSocket,
  clientId: string,
  msg: Extract<WireMessage, { type: 'request' }>,
): void {
  const channelId = clientChannel.get(clientId);
  if (!channelId) {
    log.warn('request from unjoined client', { clientId });
    return;
  }
  const ch = channels.get(channelId);
  if (!ch) return;

  // Blocked write method check (D-008)
  if (isBlockedMethod(msg.method)) {
    const rejection: ResponseMessage = {
      type: 'response',
      id: msg.id,
      ok: false,
      error: {
        code: 'METHOD_BLOCKED',
        message: `"${msg.method}" is disabled in M1 (writes disabled per D-008).`,
      },
    };
    send(ws, rejection);
    log.warn('blocked write method rejected', { clientId, channelId, method: msg.method });
    return;
  }

  // Determine sender role and forward to the other side
  const senderRole = ch.plugin?.clientId === clientId ? 'plugin' : 'mcp';
  const target = senderRole === 'plugin' ? ch.mcp : ch.plugin;

  if (!target) {
    const rejection: ResponseMessage = {
      type: 'response',
      id: msg.id,
      ok: false,
      error: { code: 'PEER_NOT_CONNECTED', message: 'Peer is not connected to this channel.' },
    };
    send(ws, rejection);
    log.warn('request dropped: peer not connected', { clientId, channelId, method: msg.method });
    return;
  }

  // Store unicast mapping: when response arrives, route back to senderRole
  ch.requestToClient.set(msg.id, { role: senderRole, enqueuedAt: Date.now() });

  log.info('forwarding request', { clientId, channelId, method: msg.method });
  send(target.ws, msg);
}

export function handleResponse(
  _ws: WebSocket,
  clientId: string,
  msg: Extract<WireMessage, { type: 'response' }>,
): void {
  const channelId = clientChannel.get(clientId);
  if (!channelId) return;
  const ch = channels.get(channelId);
  if (!ch) return;

  const entry = ch.requestToClient.get(msg.id);
  if (!entry) {
    log.warn('response for unknown request id, discarding', {
      clientId,
      channelId,
      requestId: msg.id.slice(0, 8),
    });
    return;
  }

  ch.requestToClient.delete(msg.id);

  const target = entry.role === 'plugin' ? ch.plugin : ch.mcp;
  if (!target) {
    log.warn('original requester disconnected, discarding response', {
      channelId,
      requestId: msg.id.slice(0, 8),
    });
    return;
  }

  log.info('unicasting response', {
    channelId,
    requestId: msg.id.slice(0, 8),
    role: entry.role,
  });
  send(target.ws, msg);
}

export function handleProgress(
  _ws: WebSocket,
  clientId: string,
  msg: Extract<WireMessage, { type: 'progress' }>,
): void {
  const channelId = clientChannel.get(clientId);
  if (!channelId) return;
  const ch = channels.get(channelId);
  if (!ch) return;

  const entry = ch.requestToClient.get(msg.id);
  if (!entry) return;

  const target = entry.role === 'plugin' ? ch.plugin : ch.mcp;
  if (!target) return;

  send(target.ws, msg);
}

export function handleDisconnect(clientId: string): void {
  const channelId = clientChannel.get(clientId);
  if (!channelId) return;

  clientChannel.delete(clientId);

  const ch = channels.get(channelId);
  if (!ch) return;

  if (ch.plugin?.clientId === clientId) {
    delete ch.plugin;
    log.info('plugin disconnected from channel', { clientId, channelId });
  } else if (ch.mcp?.clientId === clientId) {
    delete ch.mcp;
    log.info('mcp disconnected from channel', { clientId, channelId });
  }

  // Clean up stale request entries that were waiting on the disconnected client
  for (const [requestId, entry] of ch.requestToClient.entries()) {
    const targetRole: Role = entry.role === 'plugin' ? 'mcp' : 'plugin';
    const targetGone =
      (targetRole === 'plugin' && !ch.plugin) ||
      (targetRole === 'mcp' && !ch.mcp);
    if (targetGone) {
      ch.requestToClient.delete(requestId);
    }
  }

  destroyChannelIfEmpty(channelId);
}

export interface RelayStats {
  channelCount: number;
  pendingRequests: number;
}

export function getRouterStats(): RelayStats {
  let pendingRequests = 0;
  for (const ch of channels.values()) {
    pendingRequests += ch.requestToClient.size;
  }
  return { channelCount: channels.size, pendingRequests };
}
