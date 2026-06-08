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
  relayPort?: number;
}

export async function createAndStartServer(opts: ServerOptions): Promise<void> {
  const mcpServer = new McpServer({ name: 'figma-agent', version: '0.0.1' });

  const wsClient = new WsClient(opts.channelId, opts.relayPort !== undefined
    ? { relayPort: opts.relayPort }
    : {});
  wsClient.connect();

  registerAllTools(mcpServer, wsClient);

  await attachStdioTransport(mcpServer);

  if (opts.enableHttp) {
    const httpMcpServer = new McpServer({ name: 'figma-agent', version: '0.0.1' });
    registerAllTools(httpMcpServer, wsClient);
    await attachHttpTransport(httpMcpServer, opts.httpPort);
    logInfo('HTTP transport attached');
  }
}
