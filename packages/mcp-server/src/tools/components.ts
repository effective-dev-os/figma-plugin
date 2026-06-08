import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WsClient } from '../transport/ws-client.js';
import { logToolCall } from '../log.js';

export function registerComponentTools(server: McpServer, ws: WsClient): void {
  server.tool(
    'get_local_components',
    'Get all local components from the Figma document',
    {},
    async () => {
      const t = Date.now();
      try {
        const result = await ws.request('get_local_components');
        logToolCall('get_local_components', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('get_local_components', t, false, msg);
        throw e;
      }
    },
  );

  server.tool(
    'get_instance_overrides',
    'Get all override properties from a selected component instance',
    {
      nodeId: z.string().optional().describe('ID of the component instance. If omitted, uses the current selection.'),
    },
    async ({ nodeId }) => {
      const t = Date.now();
      try {
        const result = await ws.request('get_instance_overrides', { instanceNodeId: nodeId ?? null });
        logToolCall('get_instance_overrides', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('get_instance_overrides', t, false, msg);
        throw e;
      }
    },
  );
}
