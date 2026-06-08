import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WsClient } from '../transport/ws-client.js';
import { logToolCall } from '../log.js';

export function registerScanTools(server: McpServer, ws: WsClient): void {
  server.tool(
    'scan_text_nodes',
    'Scan all text nodes in the selected Figma node',
    { nodeId: z.string().describe('ID of the node to scan') },
    async ({ nodeId }) => {
      const t = Date.now();
      try {
        const result = await ws.request('scan_text_nodes', { nodeId });
        logToolCall('scan_text_nodes', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('scan_text_nodes', t, false, msg);
        throw e;
      }
    },
  );

  server.tool(
    'scan_nodes_by_types',
    'Scan for child nodes with specific types in the selected Figma node',
    {
      nodeId: z.string().describe('ID of the node to scan'),
      types: z.array(z.string()).describe("Array of node types to find (e.g. ['COMPONENT', 'FRAME'])"),
    },
    async ({ nodeId, types }) => {
      const t = Date.now();
      try {
        const result = await ws.request('scan_nodes_by_types', { nodeId, types });
        logToolCall('scan_nodes_by_types', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('scan_nodes_by_types', t, false, msg);
        throw e;
      }
    },
  );
}
