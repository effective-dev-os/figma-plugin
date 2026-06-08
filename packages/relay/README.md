# @figma-agent/relay

WebSocket relay that bridges the Figma plugin and the MCP server over a per-session shared-secret channel ID. Binds exclusively to `127.0.0.1:3055` (no CORS, no HTTP fallback, no 0.0.0.0).

## How it works

Two clients join the same channel: one with `role: "plugin"`, one with `role: "mcp"`. The relay routes `request` messages from MCP → plugin and `response` / `progress` messages back to the exact requester via a `requestId → role` unicast map. Write methods (21 from the D-008 block list) are rejected at the relay before forwarding.

## Run

```sh
# development (hot-reload via tsx)
pnpm --filter relay dev

# production
pnpm --filter relay build
pnpm --filter relay start
```

## Configuration

| Env var | Default | Description |
|---|---|---|
| `RELAY_PORT` | `3055` | TCP port to bind (localhost only) |

Port and bind address are fixed to `127.0.0.1` per D-004 / D-009A mitigation 5. `RELAY_PORT` overrides the port only — the loopback bind is not configurable.
