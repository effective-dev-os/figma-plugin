# Security Pre-Audit · D-009 / P6 Gate

**Date:** 2026-06-08
**Agent:** `security` (opus)
**Verdict:** `PASS_WITH_MITIGATIONS` — port may proceed with mandatory mitigations applied.

## Audit targets (pinned SHAs)

| Repo | SHA | Last commit | License |
|---|---|---|---|
| grab/cursor-talk-to-figma-mcp | `1c46823f08af9e5da54e78f36b018e95491b33e1` | 2026-04-29 | MIT |
| arinspunk/claude-talk-to-figma-mcp | `c7adf243fc2967fcda3862415d3283bd239af56d` | 2026-04-18 | MIT |

Cloned to `/tmp/figma-audit/{grab,arinspunk}` for inspection. Repos NOT modified inside project tree.

## Findings (YAML)

```yaml
- severity: HIGH
  category: data-leak
  repo: grab
  file: src/cursor_mcp_plugin/ui.html
  line: 396
  problem: Hardcoded GA4 Measurement ID + Measurement Protocol API secret (Xqiy0AtbQt-Xbx4bdoc8Kw). Plugin POSTs to google-analytics.com/mp/collect on every run, exfiltrating session metadata. Client-side api_secret defeats GA4 MP's only access control.
  figma_input_reachable: false
  suggested_fix: Delete analytics IIFE (ui.html L395-460) at port time. Strip google-analytics.com from manifest allowedDomains.
  requires_human: false

- severity: HIGH
  category: dependency-cve
  repo: grab
  file: package.json
  line: n-a
  problem: Pins @modelcontextprotocol/sdk@1.13.1 — vulnerable to GHSA-8r9q-7v3j-jr4g (ReDoS), GHSA-345p-7cg4-v4c7 (cross-client transport leak, CVSS 7.1), GHSA-w48q-cv73-mx4w (DNS rebinding off by default).
  figma_input_reachable: true
  suggested_fix: Pin ^1.29.0 in our port. Enable DNS rebinding protection when constructing HTTP transport.
  requires_human: false

- severity: HIGH
  category: dependency-cve
  repo: arinspunk
  file: package.json
  line: n-a
  problem: @anthropic-ai/dxt transitively pulls tmp@<0.2.6 (GHSA-ph9p-34f9-6g65 path-traversal HIGH, GHSA-52f5-9888-hmc6 symlink arbitrary-write).
  figma_input_reachable: false
  suggested_fix: Do NOT add @anthropic-ai/dxt as dep. We don't ship .dxt bundles.
  requires_human: false

- severity: MEDIUM
  category: auth
  repo: grab
  file: src/socket.ts
  line: 50
  problem: WS relay binds port 3055 with CORS "*" and no auth on join handshake. Any local process can join arbitrary channel name and impersonate either side.
  figma_input_reachable: true
  suggested_fix: Bind 127.0.0.1 only (delete hostname escape hatch). Replace channel-name-as-routing with channel-id-as-shared-secret (128-bit random per MCP session). Drop CORS.
  requires_human: false

- severity: MEDIUM
  category: auth
  repo: arinspunk
  file: src/socket.ts
  line: 522
  problem: Same as grab — CORS "*" + no auth. arinspunk's sessionId is dedup-only, not auth.
  figma_input_reachable: true
  suggested_fix: Same fix as grab. Promote sessionId pattern from dedup to auth (server validates expected value).
  requires_human: false

- severity: LOW
  category: owasp-a03-injection
  repo: grab
  file: src/cursor_mcp_plugin/ui.html
  line: 497
  problem: connectionStatus.innerHTML render. Today input is locally-built strings only, but innerHTML on any string is a footgun.
  figma_input_reachable: false
  suggested_fix: Switch to textContent + child elements.
  requires_human: false

- severity: LOW
  category: owasp-a03-injection
  repo: arinspunk
  file: src/claude_mcp_plugin/ui.html
  line: 317
  problem: connectionStatus.innerHTML same pattern.
  figma_input_reachable: false
  suggested_fix: textContent.
  requires_human: false

- severity: LOW
  category: secret
  repo: grab
  file: src/cursor_mcp_plugin/ui.html
  line: 397
  problem: Hardcoded API_SECRET. Already covered by HIGH data-leak finding; flagged separately as own class.
  figma_input_reachable: false
  suggested_fix: See data-leak finding.
  requires_human: false

- severity: LOW
  category: other
  repo: arinspunk
  file: scripts/launcher.js
  line: 21
  problem: execSync(`${cmd} --version`) with hardcoded cmd. Not exploitable but CVE-2025-53967-shaped pattern.
  figma_input_reachable: false
  suggested_fix: Do NOT port launcher.js. Claude Code invokes our compiled MCP entry directly.
  requires_human: false
```

## Cherry-picks from arinspunk (port verbatim)

| Patch | Files | Why |
|---|---|---|
| `zod ^3.25.0` pin | `package.json` | Fixes `tools/list "_zod undefined"` against @modelcontextprotocol/sdk@latest |
| `loadAllPagesAsync` page-loading | `src/claude_mcp_plugin/code.js`, document-tools | Required for `documentAccess: dynamic-page` traversal |
| `parentId` required on creates + `validateCommand` | `src/talk_to_figma_mcp/tools/creation-tools.ts`, `src/socket.ts:98-140` | Race-immunity for multi-agent. M1 writes-disabled but port scaffold |
| `sessionId` per-process + reconnect dedup | `src/talk_to_figma_mcp/utils/websocket.ts:15` | Stable session ID across context-compaction reconnects |
| `coerceJson` / `coerceBoolean` schema-helpers | `src/talk_to_figma_mcp/utils/schema-helpers.ts` | Claude Code occasionally passes stringified-object args; `z.coerce.boolean()` treats `"false"` as truthy |
| Unicast response routing | `src/socket.ts:41-42, 173-174, 341-358` | Relay tracks `requestToClient`; responses → requester only, not broadcast |
| Per-request inactivity timeout w/ progress reset | `src/talk_to_figma_mcp/utils/websocket.ts:88-115` | Long Figma ops (batch `get_nodes_info`) don't false-time-out |

## Mandatory port-time mitigations

1. **Strip grab's GA4 analytics block** (ui.html L395-460). No telemetry shipped.
2. **Pin `@modelcontextprotocol/sdk` ^1.29.0**. Enable DNS rebinding protection on HTTP transport.
3. **Pin `zod` ^3.25.0**.
4. **No `@anthropic-ai/dxt`** dependency.
5. **Relay binds `127.0.0.1`** only. Delete `hostname: 0.0.0.0` commented-out lines.
6. **Drop CORS `*`** from relay HTTP fallback (we serve WS only).
7. **`innerHTML` → `textContent`** in plugin UI.
8. **Zero `child_process`** in runtime data plane.
9. **DNS rebinding protection on**.
10. **Channel ID is the per-session shared secret** — MCP server generates 128-bit token, plugin UI displays for out-of-band human transfer.

## Path approval

P6 gate (security pre-audit per D-009) → **PASS**. M1 port may proceed under the mitigations above.
