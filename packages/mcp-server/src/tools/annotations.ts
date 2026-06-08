import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WsClient } from '../transport/ws-client.js';
import { logToolCall } from '../log.js';

export function registerAnnotationTools(server: McpServer, ws: WsClient): void {
  server.tool(
    'get_annotations',
    'Get all annotations in the current document or for a specific node',
    {
      nodeId: z.string().describe('Node ID to get annotations for'),
      includeCategories: z.boolean().optional().default(true).describe('Whether to include category information'),
    },
    async ({ nodeId, includeCategories }) => {
      const t = Date.now();
      try {
        const result = await ws.request('get_annotations', { nodeId, includeCategories });
        logToolCall('get_annotations', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('get_annotations', t, false, msg);
        throw e;
      }
    },
  );
}
