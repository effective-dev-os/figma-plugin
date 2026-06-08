// Structured logger. NEVER serializes message params or Figma node content.
// Only safe fields: timestamps, clientId, channelId, role, method name, errors.

export interface LogFields {
  clientId?: string;
  channelId?: string;
  role?: 'plugin' | 'mcp';
  method?: string;
  code?: number;
  reason?: string;
  [key: string]: string | number | boolean | undefined;
}

function format(level: string, message: string, fields?: LogFields): string {
  const ts = new Date().toISOString();
  if (fields && Object.keys(fields).length > 0) {
    const fieldStr = Object.entries(fields)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(' ');
    return `${ts} [${level}] ${message} ${fieldStr}`;
  }
  return `${ts} [${level}] ${message}`;
}

// All output goes to stderr. When relay is bundled inside the MCP server process,
// stdout is the JSON-RPC framing channel — any non-RPC bytes there break the protocol.
export const log = {
  info(message: string, fields?: LogFields): void {
    process.stderr.write(format('INFO', message, fields) + '\n');
  },
  warn(message: string, fields?: LogFields): void {
    process.stderr.write(format('WARN', message, fields) + '\n');
  },
  error(message: string, fields?: LogFields): void {
    process.stderr.write(format('ERROR', message, fields) + '\n');
  },
};
