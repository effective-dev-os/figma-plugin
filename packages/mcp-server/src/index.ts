#!/usr/bin/env node
import { generateChannelId, announceChannelId } from './channel.js';
import { createAndStartServer } from './server.js';
import { logError } from './log.js';

const enableHttp = process.argv.includes('--http');
const channelId = generateChannelId();

announceChannelId(channelId);

createAndStartServer({ channelId, enableHttp }).catch((err: unknown) => {
  logError(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
