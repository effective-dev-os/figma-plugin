import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WsClient } from '../transport/ws-client.js';
import { registerDocumentTools } from './document.js';
import { registerNodeTools } from './node.js';
import { registerAnnotationTools } from './annotations.js';
import { registerComponentTools } from './components.js';
import { registerScanTools } from './scan.js';
import { registerReactionTools } from './reactions.js';
import { registerMappingTools } from './mapping.js';

export function registerAllTools(server: McpServer, ws: WsClient): void {
  registerDocumentTools(server, ws);
  registerNodeTools(server, ws);
  registerAnnotationTools(server, ws);
  registerComponentTools(server, ws);
  registerScanTools(server, ws);
  registerReactionTools(server, ws);
  registerMappingTools(server, ws);
}
