import { createServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logInfo } from '../log.js';

const DEFAULT_HTTP_PORT = 3056;

export async function attachHttpTransport(server: McpServer): Promise<void> {
  const port = Number(process.env['MCP_HTTP_PORT'] ?? DEFAULT_HTTP_PORT);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    enableDnsRebindingProtection: true,
    allowedHosts: ['127.0.0.1', 'localhost'],
    allowedOrigins: [],
  });

  await server.connect(transport as unknown as Parameters<typeof server.connect>[0]);

  const httpServer = createServer((req, res) => {
    transport.handleRequest(req, res).catch((err: unknown) => {
      logInfo(`HTTP transport error: ${err instanceof Error ? err.message : String(err)}`);
      if (!res.headersSent) {
        res.writeHead(500).end();
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(port, '127.0.0.1', () => {
      logInfo(`HTTP transport listening on 127.0.0.1:${port}`);
      resolve();
    });
    httpServer.on('error', reject);
  });
}
