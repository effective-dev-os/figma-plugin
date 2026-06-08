/**
 * Integration tests for the WS relay handshake, unicast routing,
 * heartbeat timeout, and blocked-method rejection (D-008).
 *
 * Runs against a real WebSocketServer bound to a random port on 127.0.0.1.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { createRelayServer } from '../src/server.js';

// ── helpers ──────────────────────────────────────────────────────────────────

const TEST_PORT = 13055;
const TEST_HOST = '127.0.0.1';
const WS_URL = `ws://${TEST_HOST}:${TEST_PORT}`;

// 32-char lowercase hex — valid channel id
const CHANNEL_A = 'a'.repeat(32);
// Another valid channel
const CHANNEL_B = 'b'.repeat(32);

function connect(): WebSocket {
  return new WebSocket(WS_URL);
}

function waitOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}

function nextMessage(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('nextMessage timeout')), 3000);
    ws.once('message', (raw) => {
      clearTimeout(timer);
      resolve(JSON.parse(raw.toString()) as Record<string, unknown>);
    });
  });
}

function send(ws: WebSocket, msg: Record<string, unknown>): void {
  ws.send(JSON.stringify(msg));
}

// ── fixtures ──────────────────────────────────────────────────────────────────

const server = createRelayServer({ port: TEST_PORT, host: TEST_HOST });

beforeAll(async () => {
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('join handshake', () => {
  it('accepts valid join and returns join_ack (peerConnected: false) when no peer yet', async () => {
    const ws = connect();
    await waitOpen(ws);

    send(ws, { type: 'join', channelId: CHANNEL_A, role: 'plugin' });
    const ack = await nextMessage(ws);

    expect(ack.type).toBe('join_ack');
    expect(ack.channelId).toBe(CHANNEL_A);
    expect(ack.peerConnected).toBe(false);

    ws.close();
  });

  it('rejects invalid channel id with join_error invalid_channel', async () => {
    const ws = connect();
    await waitOpen(ws);

    send(ws, { type: 'join', channelId: 'too-short', role: 'mcp' });
    const err = await nextMessage(ws);

    expect(err.type).toBe('join_error');
    expect(err.reason).toBe('invalid_channel');

    ws.close();
  });

  it('rejects duplicate role with join_error role_taken', async () => {
    const channel = 'c'.repeat(32);
    const ws1 = connect();
    const ws2 = connect();
    await Promise.all([waitOpen(ws1), waitOpen(ws2)]);

    send(ws1, { type: 'join', channelId: channel, role: 'plugin' });
    await nextMessage(ws1); // ack for ws1

    send(ws2, { type: 'join', channelId: channel, role: 'plugin' });
    const err = await nextMessage(ws2);

    expect(err.type).toBe('join_error');
    expect(err.reason).toBe('role_taken');

    ws1.close();
    ws2.close();
  });

  it('both sides receive join_ack(peerConnected: true) once the pair is complete', async () => {
    const channel = 'd'.repeat(32);
    const plugin = connect();
    const mcp = connect();
    await Promise.all([waitOpen(plugin), waitOpen(mcp)]);

    send(plugin, { type: 'join', channelId: channel, role: 'plugin' });
    const pluginAck1 = await nextMessage(plugin);
    expect(pluginAck1.peerConnected).toBe(false);

    // MCP joins — both sides should now see peerConnected: true
    const pluginNextMsg = nextMessage(plugin); // will receive re-ack
    send(mcp, { type: 'join', channelId: channel, role: 'mcp' });
    const [mcpAck, pluginReAck] = await Promise.all([nextMessage(mcp), pluginNextMsg]);

    expect(mcpAck.type).toBe('join_ack');
    expect(mcpAck.peerConnected).toBe(true);
    expect(pluginReAck.type).toBe('join_ack');
    expect(pluginReAck.peerConnected).toBe(true);

    plugin.close();
    mcp.close();
  });
});

describe('request / response routing', () => {
  let plugin: WebSocket;
  let mcp: WebSocket;

  beforeEach(async () => {
    plugin = connect();
    mcp = connect();
    await Promise.all([waitOpen(plugin), waitOpen(mcp)]);

    const channel = 'e'.repeat(32);

    // Plugin joins first — no peer yet
    const pluginAck = nextMessage(plugin);
    send(plugin, { type: 'join', channelId: channel, role: 'plugin' });
    await pluginAck;

    // MCP joins — relay notifies both sides (mcp gets join_ack, plugin gets re-ack)
    const mcpAck = nextMessage(mcp);
    const pluginReAck = nextMessage(plugin);
    send(mcp, { type: 'join', channelId: channel, role: 'mcp' });
    await Promise.all([mcpAck, pluginReAck]);
  });

  afterEach(() => {
    plugin.close();
    mcp.close();
  });

  it('forwards request from mcp to plugin', async () => {
    const pluginIncoming = nextMessage(plugin);
    send(mcp, {
      type: 'request',
      id: 'req-001',
      method: 'get_document_info',
      params: {},
    });
    const msg = await pluginIncoming;
    expect(msg.type).toBe('request');
    expect(msg.id).toBe('req-001');
    expect(msg.method).toBe('get_document_info');
  });

  it('unicasts response back to mcp only (not broadcast)', async () => {
    // Plugin sends a response for req-002 (no matching request in map → discarded)
    // First, mcp sends a real request so the entry is registered
    const pluginIncoming = nextMessage(plugin);
    send(mcp, {
      type: 'request',
      id: 'req-002',
      method: 'get_selection',
      params: {},
    });
    await pluginIncoming; // plugin received request

    // Plugin responds
    const mcpReply = nextMessage(mcp);
    send(plugin, {
      type: 'response',
      id: 'req-002',
      ok: true,
      result: { nodes: [] },
    });

    const reply = await mcpReply;
    expect(reply.type).toBe('response');
    expect(reply.id).toBe('req-002');
    expect((reply as Record<string, unknown>).ok).toBe(true);
  });
});

describe('blocked methods (D-008)', () => {
  it('rejects a write method with response ok:false / METHOD_BLOCKED', async () => {
    const channel = 'f'.repeat(32);
    const ws = connect();
    await waitOpen(ws);

    send(ws, { type: 'join', channelId: channel, role: 'mcp' });
    await nextMessage(ws); // join_ack

    send(ws, {
      type: 'request',
      id: 'req-blocked',
      method: 'create_frame',
      params: {},
    });

    const reply = await nextMessage(ws);
    expect(reply.type).toBe('response');
    expect(reply.id).toBe('req-blocked');
    expect((reply as Record<string, unknown>).ok).toBe(false);
    expect(
      ((reply as Record<string, unknown>).error as Record<string, unknown>).code
    ).toBe('METHOD_BLOCKED');

    ws.close();
  });

  it('allows a read method through (forwarded to peer)', async () => {
    const channel = '0'.repeat(32);
    const mcpWs = connect();
    const pluginWs = connect();
    await Promise.all([waitOpen(mcpWs), waitOpen(pluginWs)]);

    const mcpAck = nextMessage(mcpWs);
    send(mcpWs, { type: 'join', channelId: channel, role: 'mcp' });
    await mcpAck;

    // plugin joins; relay re-acks mcp as well
    const pluginAck = nextMessage(pluginWs);
    const mcpReAck = nextMessage(mcpWs);
    send(pluginWs, { type: 'join', channelId: channel, role: 'plugin' });
    await Promise.all([pluginAck, mcpReAck]);

    const pluginIncoming = nextMessage(pluginWs);
    send(mcpWs, {
      type: 'request',
      id: 'req-read',
      method: 'get_node_info',
      params: { nodeId: '1:2' },
    });

    const forwarded = await pluginIncoming;
    expect(forwarded.type).toBe('request');
    expect(forwarded.method).toBe('get_node_info');

    mcpWs.close();
    pluginWs.close();
  });
});

describe('channel isolation', () => {
  it('messages in channel A do not reach channel B', async () => {
    const wsA_plugin = connect();
    const wsA_mcp = connect();
    const wsB_plugin = connect();
    const wsB_mcp = connect();
    await Promise.all([
      waitOpen(wsA_plugin), waitOpen(wsA_mcp),
      waitOpen(wsB_plugin), waitOpen(wsB_mcp),
    ]);

    // Join A
    const aPlugAck = nextMessage(wsA_plugin);
    send(wsA_plugin, { type: 'join', channelId: CHANNEL_A, role: 'plugin' });
    await aPlugAck;
    const aMcpAck = nextMessage(wsA_mcp);
    const aPlugReAck = nextMessage(wsA_plugin);
    send(wsA_mcp, { type: 'join', channelId: CHANNEL_A, role: 'mcp' });
    await Promise.all([aMcpAck, aPlugReAck]);

    // Join B (different channel)
    const bPlugAck = nextMessage(wsB_plugin);
    send(wsB_plugin, { type: 'join', channelId: CHANNEL_B, role: 'plugin' });
    await bPlugAck;
    const bMcpAck = nextMessage(wsB_mcp);
    const bPlugReAck = nextMessage(wsB_plugin);
    send(wsB_mcp, { type: 'join', channelId: CHANNEL_B, role: 'mcp' });
    await Promise.all([bMcpAck, bPlugReAck]);

    // B plugin should NOT receive anything when A's mcp sends a request
    let bPluginReceived = false;
    wsB_plugin.once('message', () => { bPluginReceived = true; });

    const aPluginIncoming = nextMessage(wsA_plugin);
    send(wsA_mcp, {
      type: 'request',
      id: 'iso-001',
      method: 'get_document_info',
      params: {},
    });
    await aPluginIncoming;

    // Wait a tick to catch any spurious messages to B
    await new Promise(r => setTimeout(r, 50));
    expect(bPluginReceived).toBe(false);

    wsA_plugin.close(); wsA_mcp.close();
    wsB_plugin.close(); wsB_mcp.close();
  });
});

describe('server stats', () => {
  it('getStats returns channelCount and pendingRequests', () => {
    const stats = server.getStats();
    expect(typeof stats.channelCount).toBe('number');
    expect(typeof stats.pendingRequests).toBe('number');
    expect(typeof stats.uptime).toBe('number');
  });
});
