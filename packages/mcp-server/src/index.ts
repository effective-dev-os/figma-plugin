#!/usr/bin/env node
import { createRelayServer, type RelayServer } from '@figma-agent/relay';
import { generateChannelId, announceChannelId } from './channel.js';
import { createAndStartServer } from './server.js';
import { logError, logInfo } from './log.js';

interface CliFlags {
  enableHttp: boolean;
  bundleRelay: boolean;
  relayPort: number;
  httpPort: number;
}

function parseFlags(argv: ReadonlyArray<string>): CliFlags {
  const has = (flag: string): boolean => argv.includes(flag);
  const getNum = (flag: string, fallback: number): number => {
    const eq = argv.find((a) => a.startsWith(`${flag}=`));
    if (eq) return parseInt(eq.slice(flag.length + 1), 10) || fallback;
    const idx = argv.indexOf(flag);
    if (idx >= 0 && idx + 1 < argv.length) {
      return parseInt(argv[idx + 1] ?? '', 10) || fallback;
    }
    return fallback;
  };
  return {
    enableHttp: has('--http'),
    bundleRelay: !has('--no-bundle'),
    relayPort: getNum('--relay-port', parseInt(process.env['RELAY_PORT'] ?? '3055', 10)),
    httpPort: getNum('--http-port', parseInt(process.env['MCP_HTTP_PORT'] ?? '3056', 10)),
  };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const channelId = generateChannelId();

  let relay: RelayServer | undefined;

  if (flags.bundleRelay) {
    relay = createRelayServer({ port: flags.relayPort, host: '127.0.0.1' });
    await relay.start();
    logInfo(`bundled WS relay listening on 127.0.0.1:${flags.relayPort}`);
  } else {
    logInfo(`bundled relay disabled — expecting external relay at 127.0.0.1:${flags.relayPort}`);
  }

  announceChannelId(channelId);

  const shutdown = async (signal: string): Promise<void> => {
    logInfo(`shutting down (${signal})`);
    if (relay) await relay.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await createAndStartServer({
    channelId,
    enableHttp: flags.enableHttp,
    httpPort: flags.httpPort,
    relayPort: flags.relayPort,
  });
}

main().catch((err: unknown) => {
  logError(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
