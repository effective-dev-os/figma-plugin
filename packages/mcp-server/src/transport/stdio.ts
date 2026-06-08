import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logInfo } from '../log.js';

export async function attachStdioTransport(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  logInfo('Attaching stdio transport');
  await server.connect(transport);
  logInfo('stdio transport ready');
}
