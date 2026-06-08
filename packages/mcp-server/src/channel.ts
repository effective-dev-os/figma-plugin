import { randomBytes } from 'node:crypto';
import { logInfo } from './log.js';

export function generateChannelId(): string {
  return randomBytes(16).toString('hex');
}

export function announceChannelId(channelId: string): void {
  // Print to stderr so it is visible to the user but not captured by MCP stdio transport.
  process.stderr.write(`[mcp-server] channel-id: ${channelId}\n`);
  logInfo(`WS relay channel registered. Enter this ID in the Figma plugin UI.`);
}
