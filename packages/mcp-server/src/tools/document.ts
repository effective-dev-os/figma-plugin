import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WsClient } from '../transport/ws-client.js';
import { logToolCall } from '../log.js';

export function registerDocumentTools(server: McpServer, ws: WsClient): void {
  server.tool(
    'get_document_info',
    'Get information about the current Figma document',
    {},
    async () => {
      const t = Date.now();
      try {
        const result = await ws.request('get_document_info');
        logToolCall('get_document_info', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('get_document_info', t, false, msg);
        throw e;
      }
    },
  );

  server.tool(
    'get_selection',
    'Get information about the current selection in Figma',
    {},
    async () => {
      const t = Date.now();
      try {
        const result = await ws.request('get_selection');
        logToolCall('get_selection', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('get_selection', t, false, msg);
        throw e;
      }
    },
  );

  server.tool(
    'read_my_design',
    'Get detailed information about the current selection in Figma, including all node details',
    {},
    async () => {
      const t = Date.now();
      try {
        const result = await ws.request('read_my_design');
        logToolCall('read_my_design', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('read_my_design', t, false, msg);
        throw e;
      }
    },
  );
}
