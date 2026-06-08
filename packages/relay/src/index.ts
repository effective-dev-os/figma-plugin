import { createRelayServer } from './server.js';
import { log } from './log.js';

const port = parseInt(process.env['RELAY_PORT'] ?? '3055', 10);

const server = createRelayServer({ port, host: '127.0.0.1' });

async function main(): Promise<void> {
  await server.start();

  const shutdown = async (signal: string): Promise<void> => {
    log.info('shutting down', { reason: signal });
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  log.error('fatal', { reason: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
