# @figma-agent/mcp-server

MCP server exposing 13 Figma read tools over stdio and HTTP transports. Bridges AI agents to a running Figma plugin via a local WebSocket relay.

## Usage

```sh
# stdio (default — Claude Desktop, Cursor, etc.)
node dist/index.js

# stdio + HTTP on port 3056
node dist/index.js --http

# custom HTTP port
MCP_HTTP_PORT=3099 node dist/index.js --http
```

On startup the server prints the channel ID to stderr:

```
[mcp-server] channel-id: <32-hex-chars>
```

Enter this value in the Figma plugin UI to establish the WS channel.

## Tools (13 read-only, M1)

`get_document_info` · `get_selection` · `read_my_design` · `get_node_info` · `get_nodes_info` · `get_styles` · `get_annotations` · `get_local_components` · `get_instance_overrides` · `scan_text_nodes` · `scan_nodes_by_types` · `get_reactions` · `get_code_mapping`

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `MCP_HTTP_PORT` | `3056` | HTTP transport port (only relevant with `--http`) |
| `RELAY_PORT` | `3055` | WS relay port |
| `WS_TIMEOUT_MS` | `60000` | Per-request inactivity timeout (ms) |
