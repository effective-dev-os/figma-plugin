import { z } from 'zod';
import { readFileSync } from 'node:fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WsClient } from '../transport/ws-client.js';
import { logToolCall } from '../log.js';
import type { MappingFile, GetCodeMappingResponse } from '@figma-agent/shared/mapping';

const MAPPING_PATH = '.figma/mapping.json';

export function registerMappingTools(server: McpServer, ws: WsClient): void {
  server.tool(
    'get_code_mapping',
    'Get the code-connect mapping entry for a Figma node. Reads .figma/mapping.json from CWD (no caching).',
    { nodeId: z.string().describe('The Figma node ID to look up') },
    async ({ nodeId }) => {
      const t = Date.now();
      try {
        // D-005: read at call time, no caching
        let mappingFile: MappingFile;
        try {
          const raw = readFileSync(MAPPING_PATH, 'utf8');
          mappingFile = JSON.parse(raw) as MappingFile;
        } catch {
          throw new Error(`mapping.json not found at ${MAPPING_PATH}. Run from project root or create the file.`);
        }

        const entry = mappingFile.components[nodeId];
        if (entry !== undefined) {
          const response: GetCodeMappingResponse = { status: 'mapped', nodeId, entry };
          logToolCall('get_code_mapping', t, true);
          return { content: [{ type: 'text' as const, text: JSON.stringify(response) }] };
        }

        // Not found by nodeId — also check figmaName match
        const byName = Object.values(mappingFile.components).find(
          (e) => e.figmaName === nodeId,
        );
        if (byName !== undefined) {
          const response: GetCodeMappingResponse = { status: 'mapped', nodeId, entry: byName };
          logToolCall('get_code_mapping', t, true);
          return { content: [{ type: 'text' as const, text: JSON.stringify(response) }] };
        }

        // Unmapped — get figmaName from plugin
        let figmaName = nodeId;
        try {
          const nodeInfo = await ws.request('get_node_info', { nodeId }) as { name?: string };
          if (typeof nodeInfo?.name === 'string') {
            figmaName = nodeInfo.name;
          }
        } catch {
          // non-fatal — fall back to nodeId as figmaName
        }

        const response: GetCodeMappingResponse = { status: 'unmapped', figmaName, nodeId };
        logToolCall('get_code_mapping', t, true);
        return { content: [{ type: 'text' as const, text: JSON.stringify(response) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logToolCall('get_code_mapping', t, false, msg);
        throw e;
      }
    },
  );
}
