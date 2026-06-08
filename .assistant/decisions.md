# Decisions Log

> Append-only chronological record. When a decision is overturned, add a new entry with date + reason. Never edit or delete prior entries.

---

## D-001 — Harness installed
**Date:** 2026-06-08
**Status:** accepted
**Decision:** Effective Harness installed at commit `77cdc0394620bd457d4fe33ccbb126e8acfec64d` via `/setup` skill. `PROJECT_TYPE: 2`. Primary stack: web-frontend-react-vite, node-typescript-mcp, playwright-e2e.
**Source:** `git@github.com:effective-dev-os/harness.git@77cdc0394620bd457d4fe33ccbb126e8acfec64d`
**Touch policy:** fresh install (target dir was empty)

---

## D-002 — Stack choice: React + Vite (plugin), Node + TS (MCP/relay)
**Date:** 2026-06-08
**Status:** accepted
**Decision:**
- Plugin UI: TypeScript + React + Vite. State management: `useState` v1, Zustand if grows. No Redux/MobX.
- Backend (MCP server + WS relay): Node 22 LTS + TypeScript + `@modelcontextprotocol/sdk`. Stdio + HTTP transports.
- Monorepo: pnpm workspaces. Packages: `plugin/`, `mcp-server/`, `relay/`, `shared/`.

**Rationale:**
- React over Preact/`create-figma-plugin`: user requested React; ecosystem familiarity outweighs convenience framework lock-in.
- Node over Go for backend: official MCP SDK is TS/Python only; Figma ecosystem is JS-native; shared TS types between plugin and server avoid contract duplication; single-binary distribution irrelevant for local dev runtime.
- Bun rejected: MCP clients (Claude Code etc.) primarily tested on Node; reduce surface area for pilot.

**Alternatives considered:**
- `create-figma-plugin` (Preact-based) — better DX, smaller ecosystem; not chosen because of explicit React requirement.
- Go MCP server — single binary nice but MCP SDK lag and type duplication kill it for our use.

---

## D-003 — JSONLogic as rules DSL for reviewer
**Date:** 2026-06-08
**Status:** proposed (confirm in `/pre-feature` M4 planning)
**Decision:** Reviewer rules (`.figma/rules.json`) authored in JSONLogic v1. Declarative, sandboxable, JSON-native.
**Rationale:** JEXL more powerful but less common; custom DSL adds parser maintenance burden; JS-functions-in-sandbox is a security cliff.

---

## D-004 — MCP transport: stdio + HTTP day-one, localhost-bind, no auth M1 (resolves OQ-001 + partial OQ-008)
**Date:** 2026-06-08
**Status:** accepted
**Decision:**
- Both transports registered day-one via `@modelcontextprotocol/sdk` (`StdioServerTransport` + `WebStandardStreamableHTTPServerTransport`).
- HTTP transport binds `127.0.0.1` only. No network interface exposure.
- Auth: none for pilot. Channel ID = routing, not security. Trust localhost.
- HMAC token added if/when binding to non-loopback (post-pilot).
- Source: `/pre-feature m1-plugin-mvp` consilium 2026-06-08, swarm-report/m1-plugin-mvp-plan-2026-06-08.md.
**Rationale:** SDK supports both cheaply; Claude Code uses stdio, remote agents (future) use HTTP. Localhost-bind defers OQ-008 auth without adding M1 risk. Documented threat: any process on developer machine can hit `127.0.0.1:3055` — acceptable for single-user dev workflow.

---

## D-005 — Mapping persistence: repo file SoT M1, sharedPluginData mirror deferred M2 (resolves OQ-002 for M1)
**Date:** 2026-06-08
**Status:** accepted
**Decision:**
- M1: `get_code_mapping` reads `./.figma/mapping.json` from repo at MCP-tool-call time. Read-only, no caching.
- M2: add `sharedPluginData` mirror behind a flag for in-Figma "wired up" indicator. CI gate verifies consistency.
- File is the source of truth. `sharedPluginData` is a mirror, never authoritative.
**Rationale:** M1 is read-only by design. Repo file gives code-review surface + git history. `sharedPluginData` is a write path — defer to when reviewer agent (M4) needs in-Figma annotations.

---

## D-006 — Reaction deltas computed in plugin (resolves OQ-003)
**Date:** 2026-06-08
**Status:** accepted
**Decision:**
- `get_reactions(nodeId)` performs source/destination subtree diff inside `packages/plugin` using `figma.*` API.
- MCP server is passthrough — forwards request to plugin via WS, returns plugin's JSON.
- Delta property set v1: `position (x,y)`, `size (w,h)`, `scale`, `opacity`, `fills`, `strokes`, `effects (shadows)`, `cornerRadius`, `rotation`. Extend per Smart Animate matchLayers behavior.
**Rationale:** figma.* access is plugin-local; payload over WS stays small; computation deterministic. Brief §4.3 lean. Matches OQ-003 resolution lean.

---

## D-007 — Fork base: port grab into our layout + cherry-pick arinspunk (resolves "fork strategy")
**Date:** 2026-06-08
**Status:** accepted
**Decision:**
- Do NOT hard-fork `grab/cursor-talk-to-figma-mcp`. Upstream uses Bun + flat `src/`, incompatible with D-002 (Node 22 + pnpm workspaces).
- Port MIT-licensed source files into `packages/{plugin,relay,mcp-server}` with attribution headers.
- Pin upstream SHA in `NOTICES.md` at repo root. Verify pinned SHA exists at port time.
- Cherry-pick from `arinspunk/claude-talk-to-figma-mcp` v1.0.0 (2026-04-18):
  - `zod ^3.25.0` pin (fixes `tools/list` "Cannot read properties of undefined" under @modelcontextprotocol/sdk@latest).
  - Page-loading fix (dynamic-page traversal).
  - parentId handling fix (node hierarchy edge cases).
  - Claude Code stdio bridge tuning patterns (reference, not literal copy).
- No quarterly rebase commitment during pilot. Revisit at M6.
**Rationale:** Forking incompatible build system burns rebase budget quarterly per brief §8 risk row 1. Port-with-attribution gives same legal/code basis without runtime drift. arinspunk has Claude-Code-tuned patterns worth absorbing.

---

## D-008 — Write tools disabled via feature flag, not deleted (resolves brief §10 M1 "strip write-tools")
**Date:** 2026-06-08
**Status:** accepted
**Decision:**
- All ported write tools kept in source but **not registered** with MCP server during M1.
- Feature flag `MCP_ENABLE_WRITES=false` default. Tool registration gated on flag.
- M1 registers reads only: `get_document_info, get_selection, get_node_info, get_nodes_info, read_my_design, get_local_components, get_annotations, get_styles, get_instance_overrides, scan_text_nodes, scan_nodes_by_types, get_reactions, get_code_mapping`.
- M1 regression test asserts disabled writes do not appear in `tools/list` response.
- M4 enables `set_annotation` only by flag (no re-port).
**Rationale:** Brief §10 M4 needs `set_annotation`; physical deletion forces re-port surgery. Flag-disable preserves M4 path with zero M1 surface.

---

## D-009 — Security pre-audit gate before M1 code merges
**Date:** 2026-06-08
**Status:** accepted
**Decision:**
- Before any port commits to `main`: spawn `security` agent (model: opus per CLAUDE.md Models).
- Audit scope:
  - Grep upstream grab + arinspunk for `child_process.exec`, `spawn` with interpolated input, `eval`, dynamic `require`, HTML rendering of node strings.
  - Switch any shell-out to `execFile` if found.
  - Run `npm audit` + Snyk against ported tree.
  - Verify no Figma-originated string flows into shell/eval/dynamic require/unescaped HTML.
- Audit pass-date + scanned SHA recorded in this log as `D-009A`.
- Block PR merge until audit clean.
**Rationale:** CVE-2025-53967 (figma-developer-mcp / Framelink, CVSS 7.5, Sept 2025) demonstrated indirect prompt injection via Figma file content → MCP server shell-out. Our threat model is identical even though fork base is different.

---

## D-009A — Security pre-audit PASS_WITH_MITIGATIONS
**Date:** 2026-06-08
**Status:** accepted
**Audit targets:**
- `grab/cursor-talk-to-figma-mcp` @ `1c46823f08af9e5da54e78f36b018e95491b33e1` (2026-04-29, MIT)
- `arinspunk/claude-talk-to-figma-mcp` @ `c7adf243fc2967fcda3862415d3283bd239af56d` (2026-04-18, MIT)
**Result:** PASS_WITH_MITIGATIONS. No CVE-2025-53967-class command-injection in runtime data plane (zero `child_process` usage). 9 findings logged in `swarm-report/m1-plugin-mvp-plan-2026-06-08.md` security section.
**Mandatory mitigations applied at port time:**
1. **Strip grab's GA4 analytics block** (ui.html L395-460) — hardcoded `api_secret` exfiltrates session metadata.
2. **Pin `@modelcontextprotocol/sdk` ^1.29.0** (covers GHSA-8r9q-7v3j-jr4g, GHSA-345p-7cg4-v4c7, GHSA-w48q-cv73-mx4w). grab's `1.13.1` is unsafe.
3. **Pin `zod` ^3.25.0** (SDK peer dep alignment; fixes `tools/list "_zod undefined"`).
4. **Do NOT pull `@anthropic-ai/dxt`** (transitively pulls `tmp@<0.2.6` with GHSA-ph9p-34f9-6g65 path-traversal).
5. **Relay binds `127.0.0.1` only**; delete commented `hostname: 0.0.0.0` escape hatches from both upstreams.
6. **Drop CORS `*`** from relay — WS doesn't need CORS preflight.
7. **`innerHTML` → `textContent`** in plugin UI status renders.
8. **No `child_process`** anywhere in runtime data plane. If ever needed, `execFile` with array args + whitelisted bin path.
9. **Enable DNS rebinding protection** explicitly when constructing MCP HTTP transport.
10. **Channel ID is the per-session shared secret** — MCP server generates 128-bit token, plugin UI displays it once for human-eyes-only transfer to other client. Effective auth boundary on 127.0.0.1 trust model.
**Cherry-picks from arinspunk to adopt verbatim:**
- `coerceJson` / `coerceBoolean` schema-helpers (handles Claude Code's stringified-object args + `z.coerce.boolean()` truthy-"false" bug)
- `sessionId` per-process pattern for reconnect dedup
- Unicast response routing (relay tracks `requestToClient`, sends responses only to requester, not broadcast) — required for multi-agent
- Per-request inactivity timeout resetting on `progress_update` (long Figma ops don't false-time-out)
- `parentId` required on every `create_*` tool + relay-side `validateCommand` (race-immunity; mostly M4-relevant since M1 disables writes — port the validator scaffold, register writes disabled-by-flag per D-008)
**Recorded in:** `swarm-report/security-audit-2026-06-08.md` (full YAML output)
**Approves:** P6 acceptance pre-gate. M1 port may proceed.

---

## D-010 — M1 budget revised to 7-10 dev-days
**Date:** 2026-06-08
**Status:** accepted
**Decision:** M1 estimate revised from brief §10 "3-5 dev-days" to **7-10 dev-days**. Includes:
- Port + pnpm workspace scaffold (1-2d)
- packages/shared types stubs (0.5d)
- Async-migration audit for dynamic-page (1d)
- Security pre-audit (0.5-1d, security agent)
- get_reactions deltas computation plugin-side (1.5-2d)
- get_code_mapping read path (0.5d)
- Plugin UI React+Vite + vite-plugin-singlefile (1d)
- M1 acceptance gates + smoke test (1d)
**Rationale:** Original 3-5d predated architect breakdown. Architect + skeptic + researcher findings imply 7-10d realistic. Update milestones.md M1 row.

---

## D-011 — Channel ID defaults to "default", plugin auto-connects (relaxes D-009A mitigation 10)
**Date:** 2026-06-08
**Status:** accepted
**Decision:**
- Plugin UI no longer prompts for a channel ID. On mount it auto-connects to channel `"default"`.
- `ChannelInput.tsx` removed from plugin UI surface.
- Relay shape check loosened from `/^[a-f0-9]{32}$/` to `/^[a-z0-9][a-z0-9_-]{0,63}$/` so non-hex labels are valid.
- MCP server channel ID defaults to `"default"` unless `FIGMA_CHANNEL` env var overrides (multi-instance escape hatch).
**Rationale:**
- D-004 already commits to "localhost-bind only, no auth" — channel ID as a shared secret added zero security on top of the localhost trust boundary it was protecting.
- D-009A mitigation 10 originally specified a 128-bit per-session secret. In practice, the friction (copy-paste 32-char hex on every restart) outweighed the marginal benefit on a single-user dev machine.
- Multi-instance scenarios (OQ-005) — when needed — can opt into custom channel names via `FIGMA_CHANNEL=<name>` env.
**Supersedes:** D-009A mitigation 10 (no-op in single-user pilot).
**Out of scope:**
- Multi-user shared workstations (already broken by fixed port 3055).
- LAN-bound relay (still forbidden by D-009A mitigation 5).
**Re-verification:** if pilot expands to concurrent agents on one file (OQ-005), revisit channel naming + collision handling.
