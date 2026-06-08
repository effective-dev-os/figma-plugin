import { logInfo } from './log.js';

const DEFAULT_CHANNEL = 'default';

export function generateChannelId(): string {
  return process.env['FIGMA_CHANNEL'] ?? DEFAULT_CHANNEL;
}

export function announceChannelId(channelId: string): void {
  if (channelId === DEFAULT_CHANNEL) {
    logInfo(`channel "${channelId}" — plugin connects automatically (localhost trust)`);
  } else {
    process.stderr.write(`[mcp-server] channel: ${channelId}\n`);
    logInfo(`channel "${channelId}" — paste this name in the Figma plugin if multi-instance`);
  }
}
