# Notices · Third-party attribution

This project ports source files from the following upstream projects per D-007. Both are MIT-licensed. Upstream SHAs were verified by the D-009 security pre-audit (`swarm-report/security-audit-2026-06-08.md`).

## Primary upstream

**`grab/cursor-talk-to-figma-mcp`** · MIT License · © 2025 Grab
- Repo: <https://github.com/grab/cursor-talk-to-figma-mcp>
- Pinned SHA: `1c46823f08af9e5da54e78f36b018e95491b33e1`
- Last commit at pin: 2026-04-29
- Ported into: `packages/plugin/`, `packages/relay/`, `packages/mcp-server/`
- **Excluded at port time** (per D-009A mitigations):
  - `src/cursor_mcp_plugin/ui.html` L395-460 — GA4 analytics + hardcoded API secret
  - `google-analytics.com` from manifest `allowedDomains`
  - `@modelcontextprotocol/sdk@1.13.1` pin (replaced with `^1.29.0` to close GHSA-8r9q-7v3j-jr4g, GHSA-345p-7cg4-v4c7, GHSA-w48q-cv73-mx4w)
  - Commented `hostname: "0.0.0.0"` lines in `src/socket.ts`
  - CORS `Access-Control-Allow-Origin: *` headers in relay

## Cherry-picked patches

**`arinspunk/claude-talk-to-figma-mcp`** · MIT License · © 2025 Xúlio Zé
- Repo: <https://github.com/arinspunk/claude-talk-to-figma-mcp>
- Pinned SHA: `c7adf243fc2967fcda3862415d3283bd239af56d`
- Last commit at pin: 2026-04-18

Patches adopted (per D-007 + D-009A):

| Patch | Upstream location | Ported into |
|---|---|---|
| `zod ^3.25.0` pin | `package.json` | `packages/mcp-server/package.json` |
| `loadAllPagesAsync` page-loading | `src/claude_mcp_plugin/code.js` | `packages/plugin/src/code.ts` |
| `parentId` required + `validateCommand` scaffold | `src/talk_to_figma_mcp/tools/creation-tools.ts`, `src/socket.ts:98-140` | `packages/mcp-server/src/tools/` (writes disabled-by-flag per D-008), `packages/relay/src/validate.ts` |
| `sessionId` per-process + reconnect dedup | `src/talk_to_figma_mcp/utils/websocket.ts:15` | `packages/mcp-server/src/transport/ws-client.ts` |
| `coerceJson` / `coerceBoolean` schema helpers | `src/talk_to_figma_mcp/utils/schema-helpers.ts` | `packages/mcp-server/src/schema/coerce.ts` |
| Unicast response routing | `src/socket.ts:41-42, 173-174, 341-358` | `packages/relay/src/router.ts` |
| Per-request inactivity timeout + progress reset | `src/talk_to_figma_mcp/utils/websocket.ts:88-115` | `packages/mcp-server/src/transport/timeout.ts` |

**NOT ported**: `scripts/launcher.js` (uses `execSync` — CVE-2025-53967-shaped pattern, D-009A rule 8), `scripts/configure-claude.js` (installer surface not needed).

## MIT License (both upstreams)

```
MIT License

Copyright (c) 2025 Grab Holdings Inc.
Copyright (c) 2025 Xúlio Zé

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Re-verification cadence (INVARIANT §6)

Upstream SHAs treated as stale 30 days after `2026-06-08`. Re-verify (`gh repo view`, `git log -1 --format=%H`, `npm audit`) before M2 begins. New dated entry to `decisions.md` if drift.
