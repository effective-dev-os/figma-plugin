# M1 Plugin MVP — implementation report

**Date:** 2026-06-08
**Slug:** `m1-plugin-mvp`
**Status:** code complete; human-side smoke tests pending (G1, G5–G7 final verification)
**Companions:** `m1-plugin-mvp-plan-2026-06-08.md`, `m1-acceptance.md`, `security-audit-2026-06-08.md`

---

## Pre-gate status

| ID | Gate | Status | Evidence |
|---|---|---|---|
| P1 | D-004..D-010 committed | ✅ | `.assistant/decisions.md` |
| P2 | OQs closed/partial | ✅ | `.assistant/open-questions.md` |
| P3 | `steerings/project-rules.md` seeded | ✅ | `.memory-bank/steerings/project-rules.md` |
| P4 | Brief §5.2/§7/§8/§10 M1 updated | ✅ | `.memory-bank/product-overview/brief-2026-06-08.md` |
| P5 | `milestones.md` M1 budget 7-10 dev-days | ✅ | `.memory-bank/product-overview/milestones.md` |
| P6 | Security pre-audit PASS_WITH_MITIGATIONS | ✅ | `swarm-report/security-audit-2026-06-08.md`, D-009A |
| P7 | `NOTICES.md` with pinned SHAs | ✅ | repo root |
| P8 | `packages/shared` scaffolded | ✅ | `NodeMeta`, `ReactionSpec`, `MappingEntry`, `RuleResult`, `WireMessage`, `M1_READ_TOOLS` |

---

## Build artifacts

```
packages/plugin/dist/
├── manifest.json    (404 B)
├── code.js          (20.35 kB, IIFE, ES2017)
└── ui.html          (149.99 kB, React+CSS inlined via vite-plugin-singlefile)
```

Load via `Plugins → Development → Import plugin from manifest…` pointing at `packages/plugin/dist/manifest.json`.

---

## Automated test results

| Package | Tests | Result |
|---|---|---|
| `@figma-agent/relay` | 10/10 | ✅ join flow, blocked-method rejection, unicast routing, channel isolation, heartbeat, stats |
| `@figma-agent/mcp-server` | 3/3 | ✅ G4 — 13 tools registered exactly, names match `M1_READ_TOOLS`, zero writes |
| `@figma-agent/plugin` | 6/6 | ✅ delta computation (numeric props, scale derivation, fills diff, identical-node noop, nodeId propagation) |

**Total: 19/19 ✓**

---

## Type + lint + security

| Check | Status |
|---|---|
| `pnpm typecheck` (`tsc -b` across 4 packages) | ✅ clean |
| `pnpm audit` | ✅ "No known vulnerabilities found" |
| `grep innerHTML packages/` | ✅ clean (D-009A mitigation 7) |
| `grep google-analytics packages/` | ✅ clean (mitigation 1) |
| `grep child_process packages/` | ✅ clean (mitigation 8) |
| `grep 0.0.0.0 packages/` | ✅ clean (mitigation 5) |
| `grep "\beval\b\|new Function"` | ✅ clean |

---

## Acceptance gates G1–G7

| Gate | Automated | Human smoke needed | Notes |
|---|---|---|---|
| G1 Plugin loads in Figma Desktop | — | ⏳ | Manual import test |
| G2 Plugin UI surface complete | ✅ build artifact | ⏳ visual confirm | React UI bundles to single ui.html, 3 components (ChannelInput, ConnectButton, StatusIndicator), no innerHTML |
| G3 WS handshake | ✅ relay tests | ⏳ end-to-end | join_ack, ping/pong 30s/35s, exp-backoff reconnect, channel-ID 32-char hex validation |
| G4 MCP `tools/list` = 13 reads | ✅ tools-list test | — | stdio + HTTP transports both register same allowlist |
| G5 `get_design_context` non-empty | — | ⏳ | Handler implemented; needs live Figma frame |
| G6 `get_reactions` with deltas | ✅ unit tests | ⏳ | Trigger types covered, NODE-action deltas (x/y/w/h/scale/opacity/rotation/cornerRadius/fills/strokes/effects), controller-device key triggers filtered |
| G7 `get_code_mapping` returns row | — | ⏳ | Reads `.figma/mapping.json` no caching; returns `{status:'unmapped'}` for missing entries |

---

## Architecture summary

```
┌──────────────────────────┐
│  Figma Desktop           │
│  ┌───────────────────┐   │
│  │ Plugin            │   │
│  │ ├─ controller     │   │   figma.* (dynamic-page async)
│  │ │   ├ traverse    │   │
│  │ │   ├ reactions   │   │   (deltas computed here per D-006)
│  │ │   └ handlers    │   │
│  │ └─ UI (React+Vite)│   │   ws://127.0.0.1:3055
│  │     ws-client     │───┼──────────┐
│  └───────────────────┘   │          │
└──────────────────────────┘          │
                                      ▼
                          ┌───────────────────────┐
                          │ Relay (127.0.0.1:3055)│
                          │ Channel ID = secret   │
                          │ Unicast req→client    │
                          │ Heartbeat 30/35s      │
                          └────────┬──────────────┘
                                   │
                          ┌────────▼──────────────┐
                          │ MCP Server            │
                          │ stdio + HTTP(127.0.0.1│
                          │ :3056, DNS-rebind on) │
                          │ 13 read tools         │
                          │ get_code_mapping →    │
                          │   .figma/mapping.json │
                          └────────┬──────────────┘
                                   │ stdio
                          ┌────────▼──────────────┐
                          │ Claude Code / Cursor  │
                          └───────────────────────┘
```

---

## How to run

```bash
# Terminal 1 — relay
pnpm --filter @figma-agent/relay dev

# Terminal 2 — MCP server (stdio + HTTP), prints channel ID to stderr
pnpm --filter @figma-agent/mcp-server dev -- --http
# look for: [mcp-server] channel-id: <32-char hex>

# Add to Claude Code .mcp.json
{
  "mcpServers": {
    "figma-agent": {
      "command": "node",
      "args": ["/abs/path/packages/mcp-server/dist/index.js"]
    }
  }
}

# Figma Desktop → Plugins → Development → Import plugin from manifest
# Select: packages/plugin/dist/manifest.json
# Paste channel ID from MCP stderr, click Connect.
```

---

## Decisions executed (cross-reference)

| Decision | Locus in code |
|---|---|
| D-004 stdio + HTTP day-one, 127.0.0.1, no auth | `packages/mcp-server/src/transport/{stdio,http}.ts`; HTTP via `StreamableHTTPServerTransport` with `enableDnsRebindingProtection: true`, `allowedHosts: ['127.0.0.1','localhost']` |
| D-005 mapping repo-file SoT, read at call-time | `packages/mcp-server/src/tools/mapping.ts` — `readFileSync('.figma/mapping.json')` no caching |
| D-006 plugin-side deltas | `packages/plugin/src/controller/reactions.ts` — `computeDeltas(nodeId, src, dst)`; property set per spec |
| D-007 port grab + cherry-pick arinspunk | `NOTICES.md` pins SHAs; arinspunk patches integrated: `coerceJson/coerceBoolean` (`packages/mcp-server/src/schema/coerce.ts`), sessionId + reconnect (`ws-client.ts`), unicast routing (`packages/relay/src/router.ts`), `loadAllPagesAsync` (`packages/plugin/src/controller/traverse.ts`), per-request timeout (`packages/mcp-server/src/transport/timeout.ts`) |
| D-008 writes disabled by flag | mcp-server registers only 13 reads from `M1_READ_TOOLS`; relay `BLOCKED_METHODS` rejects 24 writes with `METHOD_BLOCKED` code |
| D-009A security mitigations | All 10 applied (see `NOTICES.md` exclusions + relay `127.0.0.1`-only bind + no CORS + DNS-rebind on + no GA + textContent only) |
| D-010 budget 7-10 dev-days | Implementation actual: 1 session (orchestrator + 4 exec-agents + 1 security agent), under estimate due to security audit clearing first try |

---

## Remaining work (human-side, blocks M1→M2)

1. **Load plugin into Figma Desktop**, paste channel ID, confirm Connect goes green.
2. **Smoke test 13 tools** through Claude Code on a demo frame; save JSON to `swarm-report/m1-smoke-*.json` per G5/G6/G7.
3. **Decide pilot Figma file** (brief §10 M0 dependency) and obtain `can_edit` access from Ony.
4. **Demo screencast** per `m1-acceptance.md` DoD.

---

## Known follow-ups for M2

- M1 controller tsconfig writes to `./dist` which the Vite build also targets — fine because Vite runs after, but consider moving tsc output to `./dist-ts` for clarity.
- `vite-plugin-singlefile` 2.3 + Vite 7 vs the React 18 / @vitejs/plugin-react 4.7 chain — stable but worth re-verifying when React 19 lands as `peerDependency`.
- HTTP transport's `allowedHosts` field is marked `@deprecated` in the SDK type defs (still works in 1.29.0). If SDK 2.0 removes it (ETA 2026-07-28 per OQ-013), wrap with explicit `http.IncomingMessage` host check middleware before migrating.
- `set_annotation` re-enablement path: relay `BLOCKED_METHODS` removes `set_annotation`; mcp-server adds tool registration behind `MCP_ENABLE_WRITES=true` flag.
