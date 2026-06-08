import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WsClient } from '../transport/ws-client.js';
import { logToolCall } from '../log.js';
import type { ReactionSpec } from '@figma-agent/shared/reactions';

export function registerReactionTools(server: McpServer, ws: WsClient): void {
  server.tool(
    'get_reactions',
    'Get all reactions (interactions and transitions) for a node. Plugin computes Smart Animate deltas.',
    { nodeId: z.string().describe('The ID of the node to get reactions for') },
    async ({ nodeId }) => {
      const t = Date.now();
      try {
        const result = await ws.request('get_reactions', { nodeId }) as ReactionSpec[];
        logToolCall('get_reactions', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('get_reactions', t, false, msg);
        throw e;
      }
    },
  );
}
