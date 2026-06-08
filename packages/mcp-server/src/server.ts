import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WsClient } from './transport/ws-client.js';
import { attachStdioTransport } from './transport/stdio.js';
import { attachHttpTransport } from './transport/http.js';
import { registerAllTools } from './tools/index.js';
import { logInfo } from './log.js';

export interface ServerOptions {
  channelId: string;
  enableHttp: boolean;
  httpPort?: number;
}

export async function createAndStartServer(opts: ServerOptions): Promise<void> {
  const mcpServer = new McpServer({ name: 'figma-agent', version: '0.0.1' });

  const wsClient = new WsClient(opts.channelId);
  wsClient.connect();

  registerAllTools(mcpServer, wsClient);

  // stdio is always active
  await attachStdioTransport(mcpServer);

  if (opts.enableHttp) {
    // HTTP transport needs its own McpServer instance per SDK design
    // (each transport gets a dedicated server so sessions are isolated).
    const httpMcpServer = new McpServer({ name: 'figma-agent', version: '0.0.1' });
    registerAllTools(httpMcpServer, wsClient);
    await attachHttpTransport(httpMcpServer);
    logInfo('HTTP transport attached');
  }
}
