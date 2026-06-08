# @figma-agent/plugin

Figma plugin for the Effective ↔ Figma Bridge. Implements controller (Figma sandbox) + React UI (iframe with network access).

## Architecture

```
Figma sandbox (code.js)          UI iframe (ui.html)              Relay :3055
        |                                |                              |
figma.* API                         WebSocket                     ws://localhost:3055
        |                                |                              |
    handlers.ts ←── postMessage ──► ws-client.ts ──── JSON ────────►  |
```

## Build

```
pnpm build        # dist/code.js + dist/ui.html
pnpm dev          # watch mode
pnpm test         # vitest (delta unit tests)
```

## Loading in Figma

1. Open Figma Desktop → Plugins → Development → Import plugin from manifest
2. Point to `manifest.json` in this directory
3. Run plugin, enter channel ID from MCP server, click Connect
