import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WsClient } from '../transport/ws-client.js';
import { logToolCall } from '../log.js';

export function registerNodeTools(server: McpServer, ws: WsClient): void {
  server.tool(
    'get_node_info',
    'Get detailed information about a specific node in Figma',
    { nodeId: z.string().describe('The ID of the node to get information about') },
    async ({ nodeId }) => {
      const t = Date.now();
      try {
        const result = await ws.request('get_node_info', { nodeId });
        logToolCall('get_node_info', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('get_node_info', t, false, msg);
        throw e;
      }
    },
  );

  server.tool(
    'get_nodes_info',
    'Get detailed information about multiple nodes in Figma',
    { nodeIds: z.array(z.string()).describe('Array of node IDs to get information about') },
    async ({ nodeIds }) => {
      const t = Date.now();
      try {
        const result = await ws.request('get_nodes_info', { nodeIds });
        logToolCall('get_nodes_info', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('get_nodes_info', t, false, msg);
        throw e;
      }
    },
  );

  server.tool(
    'get_styles',
    'Get all styles from the current Figma document',
    {},
    async () => {
      const t = Date.now();
      try {
        const result = await ws.request('get_styles');
        logToolCall('get_styles', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('get_styles', t, false, msg);
        throw e;
      }
    },
  );
}
