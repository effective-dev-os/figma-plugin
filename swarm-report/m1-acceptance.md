# M1 Plugin MVP — acceptance criteria

**Date:** 2026-06-08
**Status:** authoritative pre-kickoff gate
**Source:** `/pre-feature m1-plugin-mvp` consilium (B-6) + user-confirmed decisions D-004..D-010
**Companion docs:** `swarm-report/m1-plugin-mvp-plan-2026-06-08.md`, `.assistant/decisions.md`

> M1 is **NOT** complete until every gate below passes verifiably. "Smoke test green" = all 7 gates green.

---

## Gate G1 — Plugin loads in Figma Desktop

- [ ] `Plugins → Development → Import plugin from manifest…` loads `packages/plugin/manifest.json` without error.
- [ ] Plugin UI renders inside Figma Desktop.
- [ ] No console errors in Figma Desktop devtools.

**Verification:** screenshot of loaded plugin + devtools console clean.

---

## Gate G2 — Plugin UI surface complete

- [ ] Channel ID input field visible.
- [ ] "Connect" button visible and clickable.
- [ ] Status indicator visible (3 states: disconnected/connecting/connected).
- [ ] UI bundled as single `ui.html` via `vite-plugin-singlefile` (no external CSS/JS fetches at runtime).
- [ ] React + Vite build emits `dist/ui.html` + `dist/code.js` (controller).

**Verification:** plugin screenshot + `ls dist/` shows only two files.

---

## Gate G3 — WS handshake succeeds

- [ ] WS relay starts via `pnpm --filter relay dev` on `127.0.0.1:3055` (localhost-bind only per D-004).
- [ ] Plugin connects to `ws://localhost:3055` after Connect button click.
- [ ] Status indicator turns green within 2 seconds.
- [ ] Reconnect works after relay kill + restart (heartbeat: 30s ping, 35s timeout, exp-backoff 1→2→4→8s).
- [ ] Channel ID routes messages to correct plugin instance (multi-client test: two browser tabs, different channel IDs).

**Verification:** screencast of connect → kill relay → relay restart → reconnect.

---

## Gate G4 — MCP server registered + reachable

- [ ] `.mcp.json` snippet documented in README:
  ```json
  { "mcpServers": { "figma-agent": { "command": "pnpm", "args": ["--filter", "mcp-server", "start"] } } }
  ```
- [ ] Claude Code starts MCP server via stdio without error.
- [ ] HTTP transport also responds on `127.0.0.1:3056` (or chosen port) when started with `--http` flag (D-004 stdio + HTTP day-one).
- [ ] `tools/list` returns exactly the 13 read-tool allowlist from D-008. No write tools present.
- [ ] Regression test asserts disabled writes (`create_*`, `set_*`, `move_node`, `delete_node`, `clone_node`, etc.) do NOT appear in `tools/list`.

**Verification:** `mcp.json` snippet + Claude Code tool-discovery screenshot + Jest/Vitest test output.

---

## Gate G5 — `get_design_context` returns non-empty JSON

- [ ] Select any frame in Figma Desktop (use a hand-crafted demo frame in the pilot file).
- [ ] Claude Code call: `get_design_context(nodeId)` returns JSON with at least: `id`, `name`, `type`, `children[]`, `layoutMode`, `boundVariables`.
- [ ] Dynamic-page async contract respected: `loadAsync` called before crossing page boundaries; no `currentPage` sync writes.
- [ ] `traverseNodeAsync(rootId, opts)` helper extracted in `packages/plugin` for reuse by `get_reactions` + future `review_node` (M4 prep).

**Verification:** JSON output sample saved to `swarm-report/m1-smoke-get-design-context.json`.

---

## Gate G6 — `get_reactions` returns transition with delta + duration + easing

Setup: demo frame with a configured Smart Animate `ON_HOVER` reaction (source → destination frame, scale 1 → 1.05, shadow `sm` → `lg`).

- [ ] `get_reactions(nodeId)` returns array with ≥ 1 entry.
- [ ] Each entry includes: `nodeId`, `nodeName`, `trigger` (discriminated union per Figma `Trigger` API), `actions[]` (NOT `transitions` — D-006 field-name alignment with Figma).
- [ ] For `NODE` actions, `transition` field includes: `type`, `duration` (number, seconds — NOT `durationSec`), `easing` (CUSTOM_CUBIC_BEZIER | CUSTOM_SPRING | named preset), `matchLayers` (if applicable), `destinationId`.
- [ ] For `CUSTOM_SPRING` easing, includes `mass`, `stiffness`, `damping`, `initialVelocity` (research-validated, brief §5.2 update).
- [ ] `deltas[]` computed in plugin (per D-006): at minimum `position (x,y)`, `size (w,h)`, `scale`, `opacity`, `fills`, `strokes`, `effects (shadows)`, `cornerRadius`, `rotation`.
- [ ] Plugin filters out controller-device key triggers (`XBOX_ONE`, `PS4`, `SWITCH_PRO`) — irrelevant to web/React target.

**Verification:** demo frame screenshot + raw JSON output saved to `swarm-report/m1-smoke-get-reactions.json`.

---

## Gate G7 — `get_code_mapping` returns mapped row

Setup: `.figma/mapping.json` exists at repo root with at least one mapping entry whose `figmaName` matches a component in the demo frame.

- [ ] `get_code_mapping(nodeId)` returns the matching entry from `.figma/mapping.json` per D-005.
- [ ] Mapping read at MCP-tool-call time (no caching, no hot reload — confirmed per OQ-007 lean for v1).
- [ ] Missing mapping returns `{ status: "unmapped", figmaName: "<name>", nodeId: "<id>" }` (not an exception).
- [ ] Schema matches `MappingEntry` type from `packages/shared`.

**Verification:** mapping.json sample + JSON output saved to `swarm-report/m1-smoke-get-code-mapping.json`.

---

## Pre-gate prerequisites (block M1 kickoff until done)

- [ ] **P1** Decisions D-004 through D-010 committed in `.assistant/decisions.md`. ✅ (done 2026-06-08)
- [ ] **P2** OQs 001/002/003 closed, 008 partial-resolved in `.assistant/open-questions.md`. ✅ (done 2026-06-08)
- [ ] **P3** `.memory-bank/steerings/project-rules.md` seeded with non-negotiables (Figma-only, web/React-only target, read-mostly plugin, local-loopback transport, no secrets in committed JSON, Node 22 + pnpm workspaces).
- [ ] **P4** Brief §5.2 + §7 + §8 + §10 M1 updated per research findings (field names, Desktop note, spring downgrade, harden vs add).
- [ ] **P5** `milestones.md` M1 budget revised to 7-10 dev-days per D-010.
- [ ] **P6** Security pre-audit complete per D-009. Pass-date + scanned upstream SHA recorded as `D-009A`.
- [ ] **P7** `NOTICES.md` at repo root pins upstream grab SHA + MIT attribution; lists arinspunk patches cherry-picked.
- [ ] **P8** `packages/shared` scaffolded with `NodeMeta`, `ReactionSpec`, `MappingEntry`, `RuleResult` type stubs.

---

## Out-of-scope reminders (do NOT do in M1)

- HTTP auth / HMAC / `wss://` — defer post-pilot (OQ-008 still partial-open).
- `sharedPluginData` writes — M2.
- `set_annotation` enabling — M4 (kept disabled-by-flag in M1 per D-008).
- `rules.json` schema / DSL choice (D-003) — M4.
- Cross-file REST scan / PAT storage (OQ-009) — M7+.
- Hot reload of mapping.json / rules.json (OQ-007) — v2.
- Concurrent agent routing (OQ-005) — M5+.
- Native, Sketch, XD, Framer support (anti-stories.md) — never.
- Code → Figma direction (anti-stories.md) — never.

---

## Definition of Done

M1 is **DONE** when:
1. All 7 gates G1–G7 pass with verifiable evidence saved to `swarm-report/`.
2. All 8 pre-gates P1–P8 are green.
3. Demo screencast committed showing: select frame → run `get_design_context` → run `get_reactions` → run `get_code_mapping` → all three return non-empty + schema-valid JSON.
4. README.md in `packages/plugin/` documents: install, run, troubleshoot.
5. Security audit (D-009) passes.

If any gate fails — M1 is NOT done. Push back on calls to advance to M2.
