# @effective-dev-os/figma-mcp

MCP server bridging Claude Code / Cursor to a Figma plugin. Exposes 13 read-only tools (`get_reactions`, `get_code_mapping`, `get_node_info`, …) over stdio and HTTP transports. Bundled WS relay — single-process, single-command launch.

> Routes around Figma Code Connect (which gates on the Organization plan). Works on the Professional plan.

## Install / run

```bash
npx -y @effective-dev-os/figma-mcp
```

stderr prints:

```
[mcp-server] bundled WS relay listening on 127.0.0.1:3055
[mcp-server] channel-id: <32-char hex>
```

Copy the channel ID into the Figma plugin UI (Connect button → status turns green).

## Wire to Claude Code

`.mcp.json`:

```json
{
  "mcpServers": {
    "figma-agent": {
      "command": "npx",
      "args": ["-y", "@effective-dev-os/figma-mcp"]
    }
  }
}
```

Claude Code spawns the binary via stdio. WS relay binds `127.0.0.1:3055`. Plugin connects to the same relay.

## Flags

| Flag | Default | Effect |
|---|---|---|
| `--http` | off | also attach HTTP transport on `127.0.0.1:3056` (DNS-rebind protection on) |
| `--no-bundle` | bundled relay on | skip in-process relay (expect external relay at port `RELAY_PORT`) |
| `--relay-port=N` | `3055` | env: `RELAY_PORT` |
| `--http-port=N` | `3056` | env: `MCP_HTTP_PORT` |

## Figma plugin

The MCP server expects the Figma plugin to be loaded in Figma Desktop. Get the plugin via:

- **Clone** `github.com/effective-dev-os/figma-plugin`, `pnpm install && pnpm build`, then **Plugins → Development → Import plugin from manifest** → `packages/plugin/dist/manifest.json`.
- Or download the latest `figma-plugin.zip` from the repo's GitHub Releases (when available).

## Tools (M1, read-only)

`get_document_info`, `get_selection`, `get_node_info`, `get_nodes_info`, `read_my_design`, `get_local_components`, `get_annotations`, `get_styles`, `get_instance_overrides`, `scan_text_nodes`, `scan_nodes_by_types`, `get_reactions`, `get_code_mapping`.

All write tools disabled by feature flag. `set_annotation` re-enables in a future release behind `can_edit` Figma permission.

## Security

- Relay binds `127.0.0.1` only — local-loopback trust model.
- Channel ID is a per-session 128-bit shared secret.
- DNS rebinding protection on HTTP transport.
- Zero `child_process` / `eval` / `new Function` in runtime data plane.
- No telemetry.

Full pre-audit: [`swarm-report/security-audit-2026-06-08.md`](https://github.com/effective-dev-os/figma-plugin/blob/main/swarm-report/security-audit-2026-06-08.md) in the source repo.

## Source

<https://github.com/effective-dev-os/figma-plugin>

MIT.
