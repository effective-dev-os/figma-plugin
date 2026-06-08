// Safe logger — only emits tool name, timestamp, elapsed ms, and ok|err.
// Never logs params or response bodies per project-rules.md.

export function logToolCall(tool: string, startMs: number, ok: boolean, errMsg?: string): void {
  const elapsed = Date.now() - startMs;
  const status = ok ? 'ok' : `err:${errMsg ?? 'unknown'}`;
  process.stderr.write(`[mcp-server] ${new Date().toISOString()} tool=${tool} elapsed=${elapsed}ms ${status}\n`);
}

export function logInfo(msg: string): void {
  process.stderr.write(`[mcp-server] ${msg}\n`);
}

export function logError(msg: string): void {
  process.stderr.write(`[mcp-server] ERROR ${msg}\n`);
}
