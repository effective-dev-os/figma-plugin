# Figma Agent Plugin

Figma plugin + local MCP bridge + design-reviewer agent. Routes around Code Connect on the Professional plan. See `.memory-bank/product-overview/brief-2026-06-08.md` for the full picture.

## Quick start

```bash
# 1. install + build
pnpm install
pnpm build

# 2. start MCP server (bundles WS relay in-process)
pnpm start
# stderr prints: [mcp-server] channel-id: <32-char hex>
# copy that hex.

# 3. wire Claude Code .mcp.json (the server spawns itself via this command)
{
  "mcpServers": {
    "figma-agent": {
      "command": "node",
      "args": ["/abs/path/to/figma-agent-plugin/packages/mcp-server/dist/index.js"]
    }
  }
}

# 4. Figma Desktop
#    Plugins → Development → Import plugin from manifest…
#    select: packages/plugin/dist/manifest.json
#    paste the channel ID into the plugin UI → Connect → status turns green.
```

## Architecture (one process)

```
node packages/mcp-server/dist/index.js
├─ WS relay     127.0.0.1:3055   (bundled in-process)
├─ MCP stdio    Claude Code attaches here
└─ MCP HTTP     127.0.0.1:3056   (only with --http)

Figma Desktop plugin  ←ws://localhost:3055→  relay  ←in-process→  MCP server  ←stdio→  Claude Code
```

## Flags

| Flag | Default | Effect |
|---|---|---|
| `--http` | off | also expose HTTP transport on `127.0.0.1:3056` with DNS-rebinding protection |
| `--no-bundle` | bundle on | don't start in-process relay; expect external relay at `127.0.0.1:3055` |
| `--relay-port=N` | `3055` | relay port (env `RELAY_PORT`) |
| `--http-port=N` | `3056` | MCP HTTP port (env `MCP_HTTP_PORT`) |

## Dev — separate processes

For debugging the relay independently:

```bash
# terminal 1 — relay only
pnpm --filter @figma-agent/relay dev

# terminal 2 — MCP server, skip bundled relay
pnpm --filter @figma-agent/mcp-server dev -- --no-bundle
```

## Layout

```
packages/
├── shared/      # NodeMeta, ReactionSpec, MappingEntry, WireMessage, M1_READ_TOOLS
├── relay/       # WS relay 127.0.0.1:3055, channel-ID routing
├── mcp-server/  # MCP SDK 1.29.0, stdio + HTTP, 13 read tools, bundles relay
└── plugin/      # Figma plugin: controller (figma.* + delta computation) + UI (React + Vite)
```

## M1 read tools (D-008 allowlist)

`get_document_info`, `get_selection`, `get_node_info`, `get_nodes_info`, `read_my_design`, `get_local_components`, `get_annotations`, `get_styles`, `get_instance_overrides`, `scan_text_nodes`, `scan_nodes_by_types`, `get_reactions`, `get_code_mapping`.

All writes feature-flag-disabled in M1. `set_annotation` re-enables in M4 behind `can_edit`.

## Security

See `swarm-report/security-audit-2026-06-08.md` for the D-009 pre-audit. Headlines:
- relay binds `127.0.0.1` only
- channel ID is a 128-bit per-session shared secret
- DNS-rebinding protection on HTTP transport
- zero `child_process`, `eval`, `new Function` in runtime data plane
- zero `innerHTML` in plugin UI
- no telemetry (grab's GA4 block stripped at port time)

## Status

M1 implementation complete. See `swarm-report/m1-plugin-mvp-2026-06-08.md`. Gates G1/G5/G7 await manual smoke on a live Figma file.
