# Pre-feature plan · M1 Plugin MVP

**Date:** 2026-06-08
**Slug:** `m1-plugin-mvp`
**Status:** `consilium-complete`
**Feature (verbatim):** M1 Plugin MVP: fork grab/cursor-talk-to-figma-mcp, strip write-tools, add get_reactions + get_code_mapping, plugin UI (React+Vite). See `.memory-bank/product-overview/brief-2026-06-08.md` §10 M1.
**Subagents:** architect, skeptic, researcher, reviewer (all `opus`)

---

## TL;DR

- **Counts:** 8 HIGH · 11 MEDIUM · 5 LOW · 22 research findings
- **Top 3 must-fix before M1 codes:**
  1. **Resolve OQ-001 / OQ-002 / OQ-003** in `.assistant/decisions.md`. Brief §10 M0 lists this as a prerequisite — M1 currently violates that gate. Skeptic recommends *abort* on this alone.
  2. **Do not "fork" grab.** Upstream uses Bun + flat `src/` layout; D-002 mandates Node 22 + pnpm workspaces `packages/*`. Treat upstream as MIT-licensed reference, port files with attribution. Pin upstream SHA in `decisions.md`.
  3. **Re-scope "strip write-tools".** Brief §10 M4 needs `set_annotation`; wholesale removal forces re-add. Enumerate the exact retained/disabled allowlist; keep `set_annotation` behind `can_edit` flag.

- **Research downgrades risk register:** Figma `Easing` *does* expose spring `stiffness/damping/mass` directly (developers.figma.com/docs/plugins/api/Transition/). Brief §5.2 + §8 risk row "Spring presets don't map 1:1 to Framer Motion" is wrong — 1:1 mapping is possible. Update brief.

---

## Blockers (HIGH, requires_human: true)

### B-1 · Open questions block M1 per M0 contract
- **Cited:** INVARIANT §7, OQ-001, OQ-002, OQ-003, brief §10 M0
- **Problem:** Brief §10 M0 explicitly lists "Resolve the open questions in §9" as M0 deliverable. OQ-001 (transport), OQ-002 (mapping persistence), OQ-003 (reactions deltas location) directly shape M1 deliverables. Proposal skips M0 step.
- **Fix:** Append D-004 / D-005 / D-006 to `decisions.md` with resolution leans already in `open-questions.md`:
  - OQ-001 → **stdio only for M1**; HTTP deferred to M5/M6 (auth surface couples with OQ-008).
  - OQ-002 → **repo file source-of-truth for M1**; `sharedPluginData` mirror deferred to M2 (it's a write path; M1 is read-only).
  - OQ-003 → **compute deltas in plugin** (figma.* access is local, payload stays small, deterministic — matches brief §4.3).

### B-2 · "Strip write-tools" contradicts M4
- **Cited:** D-002 alignment, brief §4.1, §10 M4, OQ-006
- **Problem:** brief §10 M4 ships `set_annotation` (optional) into reviewer agent; wholesale M1 strip = M4 re-add = wasted fork budget. Also brief §3.2 explicitly notes write access useful for reviewer agent. Three agents flagged this independently (architect, skeptic, reviewer).
- **Fix:** M1 explicit allowlist — keep **reads** only at runtime: `get_document_info, get_selection, get_node_info, get_nodes_info, read_my_design, get_local_components, get_annotations, get_styles, get_instance_overrides, scan_text_nodes, scan_nodes_by_types, get_reactions, get_code_mapping`. Disable all writes via feature flag (not physical deletion); `set_annotation` re-enabled in M4 behind `can_edit`. Document the disabled-set in M1 plan; add a test asserting disabled tools are not registered.

### B-3 · Fork base mismatches stack
- **Cited:** D-002, brief §3.2
- **Problem:** grab/cursor-talk-to-figma-mcp uses Bun runtime + flat `src/cursor_mcp_plugin/`, `src/socket.ts`, `src/talk_to_figma_mcp/`. D-002 + `stack.md` mandate Node 22 + pnpm workspaces with `packages/{plugin,mcp-server,relay,shared}`. Literal fork pulls Bun in (D-002 violation) or forces rewriting build system on day one.
- **Fix:** Port files into our layout under MIT attribution (`NOTICES.md` with upstream SHA + license). Drop Bun-specific scripts. Rebuild under pnpm + tsx + `tsc -b`. Cheaper than quarterly rebase (brief §8 risk row 1). Consider cherry-picking from arinspunk/claude-talk-to-figma-mcp (smaller fork, Claude-Code-tuned, zod-3.25 fix).

### B-4 · Security pre-audit missing (CVE-2025-53967 precedent)
- **Cited:** brief §8 risk register, INVARIANT §6
- **Problem:** CVE-2025-53967 (figma-developer-mcp / Framelink, CVSS 7.5, Sept 2025, GHSA-gxw4-4fc5-9gr5) was a command-injection RCE via `child_process.exec` on untrusted Figma file content. Different project from grab, but **same threat class** — any MCP that ingests Figma node data is exposed. Proposal names no security gate before fork.
- **Fix:** Pre-fork audit step in M1: grep upstream for `child_process.exec`, `spawn` with interpolated input; verify no `eval`/dynamic `require`/HTML rendering of node strings; switch any shell-out to `execFile`. Run `npm audit` + Snyk against the ported tree. Disable Dependabot-off bypass by enabling our own scan. Record SHA + audit pass-date in `decisions.md` before code merges. Spawn `security` agent (`opus` per CLAUDE.md Models).

### B-5 · `documentAccess: dynamic-page` forces async everywhere
- **Cited:** brief §7.2 (manifest already declares `dynamic-page`), Figma migration docs
- **Problem:** Mandatory for new plugins (GA 2025-02-21). `figma.currentPage` becomes read-only, off-page node access throws unless preceded by `loadAsync`/`findAllAsync`/`loadAllPagesAsync`. Upstream grab predates this in places — straight port will throw at runtime.
- **Fix:** Before porting plugin code, audit every `figma.*` call against the dynamic-page async contract. Replace sync APIs (`getPluginData`, sync traversal) with `*Async` variants. Add a lint/grep rule (`no-sync-figma`) to prevent regression. Use `setCurrentPageAsync` for any page-crossing operation.

### B-6 · M1 acceptance criteria not falsifiable
- **Cited:** brief §10 M1 ("Manual smoke test on a demo frame"), milestones.md M1→M2
- **Problem:** "Smoke test green" is two readings deep. Two engineers will disagree.
- **Fix:** Write `swarm-report/m1-acceptance.md` before kickoff with these gates:
  1. Plugin loads in Figma Desktop via `Plugins → Development → Import from manifest`.
  2. Plugin UI shows channel ID input + Connect button + status indicator (matches brief §4.1 / §10 M1).
  3. WS handshake succeeds against `ws://localhost:3055`; status indicator turns green.
  4. MCP server registered in `.mcp.json` starts under Claude Code; `get_document_info` returns non-empty JSON for selected frame.
  5. `get_reactions` returns ≥1 transition with `duration` + `easing` for a frame with configured Smart Animate hover.
  6. `get_code_mapping` returns the mapped row for a node whose Figma name matches `.figma/mapping.json`.
  7. None of the 21 disabled write tools appears in `tools/list` response (regression test).

### B-7 · `.memory-bank/steerings/` is empty
- **Cited:** INVARIANT §7, reviewer.md mandate
- **Problem:** Reviewer cross-check #3 is `steerings/project-rules.md`. Directory is empty; reviewer gate is structurally toothless.
- **Fix:** Seed `steerings/project-rules.md` with the non-negotiables already implicit in brief: Figma-only, web/React-only target, read-mostly plugin, local-loopback transport, no secrets in committed mapping/rules JSON. Block M1 codes until seeded.

### B-8 · Module-boundary for `packages/shared` not in M1 task list
- **Cited:** CLAUDE.md, `stack.md`:27, brief §5
- **Problem:** Without `packages/shared` set up day-one with `NodeMeta`, `ReactionSpec`, `MappingEntry`, `RuleResult` stubs, `packages/plugin` and `packages/mcp-server` will each invent their own types → drift before M2 codegen loop.
- **Fix:** M1 task #0 (before any feature work): scaffold `packages/shared` with the four type stubs. Plugin and mcp-server consume via `@figma-agent/shared` with tsc project references. Add to M1 plan explicitly.

---

## Concerns (MEDIUM)

### C-1 · `get_reactions` already exists upstream
Researcher confirmed grab repo ships `get_reactions` in its read-tools surface (corroborated via API + repo). M1 task should read "**harden + extend** `get_reactions` (verify dynamic-page async behavior, align field names with brief §5.2)" not "add". Update milestones.md M1 row.

### C-2 · Figma Reaction field-naming drift in brief §5.2
- Brief sample uses `transitions[]` + `durationSec`. Actual API:
  - `Reaction.actions[]` (legacy singular `Reaction.action` is deprecated).
  - `Transition.duration` (number, seconds — no `Sec` suffix).
- **Fix:** Either rename our public JSON shape to `actions` + `duration` (preferred — matches Figma exactly, lower translation cost) or document the unit explicitly. Land naming decision in M1 plan before writing `ReactionSpec` in `packages/shared`.

### C-3 · Discriminated unions for `Trigger` + `Action`
- Triggers: `ON_CLICK`, `ON_HOVER`, `ON_PRESS`, `ON_DRAG`, `ON_MEDIA_END`, `AFTER_TIMEOUT { timeout }`, `MOUSE_UP/DOWN { delay }`, `MOUSE_ENTER/LEAVE { delay, deprecatedVersion }`, `ON_KEY_DOWN { device, keyCodes }`, `ON_MEDIA_HIT { mediaHitTime }`.
- Actions: `BACK | CLOSE | URL | UPDATE_MEDIA_RUNTIME | SET_VARIABLE | SET_VARIABLE_MODE | CONDITIONAL | NODE`. Only `NODE` carries a `Transition`.
- **Fix:** Encode exhaustive discriminated unions in `packages/shared`. Filter controller-device key triggers (`XBOX_ONE/PS4/SWITCH_PRO`) — irrelevant to web/React scope. Animation extraction in `get_reactions` only matters for `NODE` actions; other action types ship intent-only JSON, no motion.

### C-4 · Reactions deltas location undecided (OQ-003 mirrors B-1)
Lean is plugin-side (brief §4.3) — but until landed in `decisions.md` exec-agents will pick arbitrarily. Subsumed by B-1.

### C-5 · `get_code_mapping` blocked on OQ-002 (mirrors B-1)
M1-MUST: read-only from `.figma/mapping.json`. Defer `sharedPluginData` write path to M2. Subsumed by B-1.

### C-6 · MCP SDK version pin
- Current stable: `@modelcontextprotocol/sdk@1.29.0` (2026-03-30, 70 days old at writing — within freshness but past 30-day soft threshold).
- v2.0 alpha out (2026-04-01) with breaking changes: JSON-RPC `-32602` for unknown tools, `tasks` moves to `capabilities.tasks`, zod removed from peerDependencies, deprecated `.tool/.prompt/.resource` signatures removed. Stable v2 slated 2026-07-28.
- **Fix:** Pin `1.29.0` for M1. Re-verify before M2 starts (INVARIANT §6). Migrate to v2 only after M3. Mirror arinspunk's `zod ^3.25.0` pin (they already fixed the `tools/list` "Cannot read properties of undefined" error).

### C-7 · Plugin UI bundling needs `vite-plugin-singlefile`
Canonical pattern: separate `vite.config.plugin.ts` (controller, IIFE) + `vite.config.ui.ts` (UI, `viteSingleFile()` inlines into `ui.html`). Reference: iGoodie/figma-plugin-react-vite. Land this in M1 build setup.

### C-8 · `ws://localhost:3055` works in Figma Desktop only
- Figma web (https://) blocks `ws://` under CSP mixed-content. Figma Desktop loads plugins over `http://` so `ws://` works.
- **Fix:** Document "Figma Desktop required" in M1 README. If web support ever needed, add `wss://` with self-signed cert — out of M1.

### C-9 · Fork rebase budget unallocated
brief §8 risk row 1 commits to "rebase quarterly" against upstream. Proposal names no owner, no cadence beyond "quarterly". Pilot is one developer.
- **Fix:** Decision in `decisions.md`: own SHA + rebase cadence at M6 handoff. Don't commit to upstream sync during pilot; revisit after M5 metrics.

### C-10 · Time estimate likely under-budgeted
Brief §10 M1 says 3–5 dev-days. Skeptic + researcher findings imply 7–10 dev-days realistic if `get_reactions` deltas computed plugin-side, plus async-migration audit, plus security pre-audit, plus packages/shared scaffolding. Push back on the 3–5 figure when M1 plan is written.

### C-11 · Shared traversal primitive across M1/M4
`get_design_context` (M1), `get_reactions` (M1), and `review_node` (M4) all walk the same node tree with different meta selectors. Extract `traverseNodeAsync(rootId, opts)` in `packages/plugin` day-one so M4 doesn't duplicate.

---

## Notes (LOW)

- **N-1** · Vanilla single `ui.css` is enough for the plugin's ~80-line UI. CSS modules adds Vite config surface for no payoff. Revisit only if UI grows past 3 screens.
- **N-2** · D-003 (JSONLogic for `rules.json`) is M4 work — explicitly out of scope for M1. Exec-agents must not touch `.figma/rules.json` schema during M1. D-003 stays "proposed" until `/pre-feature M4`.
- **N-3** · arinspunk fork as reference, not base. Cherry-pick: zod 3.25 pin, page-loading bug fix (2026-04 v1.0.0), parentId handling. Don't fork off it (smaller community, 612 stars vs grab 6.8k).
- **N-4** · `channel-ID routing` semantics in upstream need source-level verification by exec-agent before M1 closes (researcher couldn't confirm global vs per-MCP scope via web).
- **N-5** · M1 DoD must copy brief §10 M1 deliverables verbatim — don't paraphrase away "channel ID + Connect button + status indicator" and "Manual smoke test".

---

## Research findings (confidence-flagged)

Selected high-leverage facts (full list in per-agent section below):

| Finding | Confidence | Source date | Action |
|---|---|---|---|
| grab/cursor-talk-to-figma-mcp · 6.8k stars · MIT · last push 2026-04-29 · not archived | high | 2026-06-08 | proceed with port (not fork) |
| grab ships `get_reactions` already; M1 should re-word as "harden" not "add" | medium | 2026-06-08 | update milestones.md M1 |
| Figma `Easing.CUSTOM_SPRING` exposes `mass`, `stiffness`, `damping`, `initialVelocity`; named presets `GENTLE/QUICK/BOUNCY/SLOW` also available | medium | 2026-06-08 | **downgrade brief §8 risk row** + remove "calibrate visually" from brief §5.2 |
| `Reaction` uses `actions[]` (deprecated singular `action`); `Transition.duration` (no `Sec` suffix) | medium | 2026-06-08 | rename shared types (C-2) |
| `documentAccess: dynamic-page` GA 2025-02-21; mandatory async traversal | medium | 2026-06-08 | B-5 |
| CVE-2025-53967 was in figma-developer-mcp (Framelink), NOT grab. Same threat class (exec on untrusted Figma content). | corroborated | 2026-06-08 | B-4 |
| `@modelcontextprotocol/sdk@1.29.0` stable; v2 alpha breaking; stable v2 ETA 2026-07-28 | corroborated | 2026-06-08 | C-6 |
| `vite-plugin-singlefile` is canonical for Figma plugin UI bundling | corroborated | 2026-06-08 | C-7 |
| `ws://localhost` works in Figma Desktop only (CSP mixed-content in web) | medium | 2026-06-08 | C-8 |
| arinspunk fork v1.0.0 (2026-04-18) ships zod 3.25 pin + Claude-Code tuning | high | 2026-06-08 | cherry-pick reference (N-3) |
| No known security advisories on grab repo; Dependabot disabled upstream | medium | 2026-06-08 | run our own scan (B-4) |
| `ws` lib + Node 22 native WebSocket = current standard; recommended 30s ping / 35s timeout / exp-backoff reconnect | medium | 2026-06-08 | M1 baseline |

---

## Out-of-scope (declared by subagents)

- HTTP transport, auth (OQ-008), `wss://` cert, hot reload (OQ-007), multi-agent concurrent channels (OQ-005), cross-file REST scan (OQ-009), reviewer findings cap (OQ-010), `rules.json` schema (D-003) — all deferred per M0/M4/M7+ milestones.
- Native iOS/Android, Sketch/XD/Framer, non-React frontend mapping (anti-stories.md).

---

## Open questions raised (new)

> Recommended additions to `.assistant/open-questions.md` if accepted.

- **OQ-011 (new)** · Fork base policy: port grab into our layout (B-3) vs. fork arinspunk (smaller, Claude-tuned) vs. clean-room. **Lean:** port from grab, cherry-pick arinspunk patches.
- **OQ-012 (new)** · Reaction shape naming in `packages/shared`: match Figma API verbatim (`actions[]`, `duration`) vs. brief §5.2 wording (`transitions[]`, `durationSec`). **Lean:** match Figma exactly.
- **OQ-013 (new)** · Plugin runtime support matrix: Figma Desktop only (matches `ws://localhost` constraint) vs. Desktop + web (forces `wss://`). **Lean:** Desktop only for pilot.
- **OQ-014 (new)** · MCP SDK v1 vs v2 timing: lock v1.29.0 through M5; migrate post-pilot.
- **OQ-015 (new)** · Spring presets mapping is *easier* than brief assumed (Figma exposes stiffness/damping/mass). Update brief §5.2 + §8 risk register? **Lean:** yes, both.

---

## Per-agent verbatim findings (audit trail)

### architect

```yaml
- severity: HIGH
  category: dependency
  file: proposal
  line: n-a
  problem: Brief §3.2 calls for "fork grab/cursor-talk-to-figma-mcp", but upstream uses Bun and flat src/ layout while D-002 + stack.md mandate Node 22 + pnpm workspaces packages/*. Literal fork creates immediate stack mismatch.
  suggested_fix: Treat upstream as reference, not fork. Copy MIT-licensed source files into packages/plugin/ and packages/relay/ with attribution headers, drop Bun scripts, rebuild under pnpm + tsx.
  requires_human: true
  confidence: corroborated

- severity: HIGH
  category: scope
  file: .memory-bank/product-overview/brief-2026-06-08.md
  line: 374
  problem: M1 says "remove unnecessary write tools" but upstream ships 23+ writes. "Slim down" is vague — exec-agent will keep too much (security surface) or strip something §6 reviewer needs.
  suggested_fix: M1 ships explicit read-only allowlist; set_annotation moves to M4 behind can_edit flag; everything else deleted.
  requires_human: false
  confidence: high

- severity: HIGH
  category: module-boundary
  file: proposal
  line: n-a
  problem: get_reactions deltas computation (OQ-003) crosses module boundaries — plugin has figma.* access, mcp-server has MCP surface, neither has both.
  suggested_fix: Compute deltas in packages/plugin (figma.* local, payload small, deterministic). mcp-server passes through. Lock as D-004 before M1 starts.
  requires_human: false
  confidence: high

- severity: HIGH
  category: pattern-choice
  file: .memory-bank/tech-details/stack.md
  line: 21
  problem: documentAccess dynamic-page is mandatory; forces async figma.* APIs and read-only figma.currentPage. Straight copy of sync grab code throws at runtime.
  suggested_fix: Audit every figma.* call against dynamic-page async contract before porting; add no-sync-figma lint rule.
  requires_human: false
  confidence: corroborated

- severity: HIGH
  category: scope
  file: .memory-bank/product-overview/brief-2026-06-08.md
  line: 376
  problem: M1 acceptance "manual smoke test" is not falsifiable.
  suggested_fix: Concrete checklist in swarm-report/m1-acceptance.md (plugin loads, MCP starts, get_design_context non-empty, get_reactions returns transition, get_code_mapping returns mapped row).
  requires_human: false
  confidence: high

- severity: MEDIUM
  category: migration
  file: .assistant/open-questions.md
  line: 12
  problem: OQ-002 (mapping persistence) open while get_code_mapping in M1 scope. Wrong pick forces rework in M2 or M4.
  suggested_fix: M1 only repo-file read. Defer sharedPluginData to M2. Promote to D-004.
  requires_human: false
  confidence: high

- severity: MEDIUM
  category: pattern-choice
  file: .memory-bank/tech-details/stack.md
  line: 21
  problem: stack.md commits "Both [stdio + HTTP] on day one" but OQ-001 still open. HTTP needs auth/CORS thinking pilot doesn't have.
  suggested_fix: M1 ships stdio only. HTTP added M5/M6 when remote-agent need materializes. Close OQ-001.
  requires_human: false
  confidence: medium

- severity: MEDIUM
  category: module-boundary
  file: proposal
  line: n-a
  problem: packages/shared in stack but missing from M1 task list. Plugin and mcp-server will diverge on types.
  suggested_fix: M1 task #0 — scaffold packages/shared with NodeMeta, ReactionSpec, MappingEntry, RuleResult.
  requires_human: false
  confidence: high

- severity: MEDIUM
  category: dependency
  file: .memory-bank/product-overview/brief-2026-06-08.md
  line: 345
  problem: CVE-2025-53967 precedent — inheriting WS framing from grab without explicit upstream CVE watch.
  suggested_fix: Pin upstream SHA in NOTICES.md, add Dependabot/Renovate, document tag we cherry-picked, M6 revisits cadence.
  requires_human: false
  confidence: medium

- severity: MEDIUM
  category: migration
  file: proposal
  line: n-a
  problem: review_node (M4) and get_design_context (M1) need same traversal primitive.
  suggested_fix: Extract traverseNodeAsync(rootId, opts) in packages/plugin day-one.
  requires_human: false
  confidence: high

- severity: LOW
  category: pattern-choice
  file: .memory-bank/tech-details/stack.md
  line: 11
  problem: CSS modules overkill for plugin's 80-line UI.
  suggested_fix: Single vanilla ui.css imported by ui.tsx.
  requires_human: false
  confidence: medium

- severity: LOW
  category: scope
  file: .assistant/decisions.md
  line: 37
  problem: D-003 (JSONLogic) is M4 work; rules.json out of M1 scope.
  suggested_fix: Note explicitly in M1 plan. Don't let exec-agents touch rules.json schema.
  requires_human: false
  confidence: high

- severity: LOW
  category: dependency
  file: proposal
  line: n-a
  problem: arinspunk fork has Claude-tuned patterns not named in M1 acceptance.
  suggested_fix: One-line M1 plan note — check arinspunk main.ts if grab stdio bridge has Claude Code gaps.
  requires_human: false
  confidence: medium
```

### skeptic

```yaml
- severity: HIGH
  category: invariant-violation
  file: proposal
  line: n-a
  problem: M1 scope commits while OQ-001/002/003 open; brief §10 M0 lists "Resolve open questions" as M1 precondition.
  suggested_fix: Abort /pre-feature on M1. Resolve OQs in decisions.md first.
  requires_human: true
  confidence: high

- severity: HIGH
  category: premise-flaw
  file: .memory-bank/product-overview/brief-2026-06-08.md
  line: 374
  problem: "Strip write-tools" wholesale conflicts with M4 set_annotation (§4.1, §10 M4).
  suggested_fix: Disable/feature-flag write tools off by default rather than physical removal; keep set_annotation behind flag.
  requires_human: true
  confidence: high

- severity: HIGH
  category: hidden-cost
  file: .memory-bank/product-overview/brief-2026-06-08.md
  line: 345
  problem: CVE-2025-53967 precedent (command injection RCE, CVSS 7.5, Sept 2025); proposal names no security audit before fork.
  suggested_fix: Pre-fork audit by security agent; pin upstream SHA in decisions.md; no fork until audit passes.
  requires_human: true
  confidence: corroborated

- severity: HIGH
  category: invariant-violation
  file: .assistant/INVARIANTS.md
  line: 40
  problem: grab repo facts (6.8k stars, active) cited in brief without 30-day re-verify entry in decisions.md.
  suggested_fix: Append dated re-verify entry — upstream SHA, MIT, last-commit date.
  requires_human: true
  confidence: corroborated

- severity: MEDIUM
  category: scope-creep
  file: proposal
  line: n-a
  problem: get_code_mapping gated by OQ-002; implementing before persistence decision = throwaway or premature commitment.
  suggested_fix: Split M1 — ship get_reactions + UI in M1; defer get_code_mapping to sub-milestone after OQ-002 resolves.
  requires_human: false
  confidence: high

- severity: MEDIUM
  category: hidden-cost
  file: .memory-bank/product-overview/brief-2026-06-08.md
  line: 337
  problem: Quarterly rebase commitment with no owner or budget; single-developer pilot.
  suggested_fix: Evaluate arinspunk as alternative base; document rebase cadence + owner before accepting fork.
  requires_human: false
  confidence: medium

- severity: MEDIUM
  category: premise-flaw
  file: .memory-bank/product-overview/brief-2026-06-08.md
  line: 56
  problem: "Strip write-tools" without enumerating which = untestable M1 acceptance.
  suggested_fix: Architect enumerates removed/retained tools; test asserts disabled set not registered.
  requires_human: false
  confidence: high

- severity: LOW
  category: premise-flaw
  file: .memory-bank/product-overview/brief-2026-06-08.md
  line: 370
  problem: 3–5 dev-day estimate predates architect breakdown; under-budgets get_reactions deltas.
  suggested_fix: Architect produces task-level hour estimate. Expect 7–10 dev-days.
  requires_human: false
  confidence: medium
```

### reviewer

```yaml
- severity: HIGH
  category: contradicts-prior-decision
  file: proposal
  line: n-a
  problem: "Strip write-tools" wholesale vs brief §4.1 and §10 M4 needing set_annotation.
  cites: D-002, OQ-006
  suggested_fix: Reframe as 'strip non-essential writes, retain set_annotation behind can_edit flag' OR defer set_annotation to M4 in decisions.md.
  requires_human: true
  confidence: high

- severity: HIGH
  category: missing-context
  file: .memory-bank/steerings/
  line: n-a
  problem: .memory-bank/steerings/ empty; reviewer.md mandates project-rules.md as cross-check source #3.
  cites: INVARIANT-§7
  suggested_fix: Seed steerings/project-rules.md before M1 with implicit rules (Figma-only, web/React-only, read-mostly, local-loopback).
  requires_human: true
  confidence: high

- severity: MEDIUM
  category: missing-context
  file: proposal
  line: n-a
  problem: OQ-001 (transport) and OQ-002 (mapping persistence) shape M1 deliverables but unresolved.
  cites: OQ-001, OQ-002
  suggested_fix: Either defer inside M1 with documented interim (stdio-only, repo-file only) or resolve in pre-feature before code.
  requires_human: true
  confidence: high

- severity: MEDIUM
  category: missing-context
  file: proposal
  line: n-a
  problem: get_reactions deltas location undecided (OQ-003); M1 contract drift risk against M2.
  cites: OQ-003
  suggested_fix: Fix OQ-003 resolution (plugin-side per §4.3) as D-004 before coding.
  requires_human: true
  confidence: high

- severity: LOW
  category: factual-error
  file: proposal
  line: n-a
  problem: Proposal paraphrases brief §10 M1; omits "channel ID + Connect button + status indicator" and "Manual smoke test" specificity.
  cites: D-001
  suggested_fix: Copy §10 M1 deliverables verbatim as DoD checklist when writing M1 plan.
  requires_human: false
  confidence: medium
```

### researcher

```yaml
- finding: grab/cursor-talk-to-figma-mcp has 6820 stars, 81 open issues, MIT license, last push 2026-04-29, not archived
  source: https://api.github.com/repos/grab/cursor-talk-to-figma-mcp
  source_date: 2026-06-08
  confidence: high
  relevance: Confirms reference impl active; MIT permits stripping writes and re-publishing
  contradicts: n-a

- finding: grab repo most recent commit 2026-04-29 ("add analytics"); prior commits in March 2026 added Claude Code support and local-components handling
  source: https://api.github.com/repos/grab/cursor-talk-to-figma-mcp/commits
  source_date: 2026-06-08
  confidence: high
  relevance: Six-week HEAD acceptable as fork base
  contradicts: n-a

- finding: grab read tools — get_document_info, get_selection, read_my_design, get_node_info, get_nodes_info, scan_text_nodes, scan_nodes_by_types, get_annotations, get_reactions, get_styles, get_local_components, get_instance_overrides. Writes — create_rectangle/frame/text, set_text_content, set_multiple_text_contents, set_layout_mode, set_padding, set_axis_align, set_fill_color, set_stroke_color, set_corner_radius, move_node, resize_node, delete_node, clone_node, set_annotation, set_multiple_annotations, create_component_instance, set_instance_overrides, set_default_connector, create_connections
  source: https://github.com/grab/cursor-talk-to-figma-mcp
  source_date: 2026-06-08
  confidence: medium
  relevance: Canonical write-tool list to delete; get_reactions exists upstream so M1 "add" is actually "harden/extend"; get_code_mapping is genuinely new
  contradicts: brief §10 M1 phrasing ("Add get_reactions")

- finding: grab plugin source at src/cursor_mcp_plugin/, WS relay at src/socket.ts, MCP server TypeScript — three-component split matches brief §4.1 topology
  source: https://github.com/grab/cursor-talk-to-figma-mcp
  source_date: 2026-06-08
  confidence: medium
  relevance: Port is mostly file-moves + pnpm-workspace wiring
  contradicts: n-a

- finding: no GitHub security advisories on grab repo; Dependabot alerts disabled (403 on public API)
  source: https://api.github.com/repos/grab/cursor-talk-to-figma-mcp/security-advisories
  source_date: 2026-06-08
  confidence: medium
  relevance: Transitive vuln scanning on us — npm audit + Snyk on forked tree
  contradicts: n-a

- finding: arinspunk/claude-talk-to-figma-mcp — 612 stars, 4 open issues, MIT, last push 2026-04-18, v1.0.0 finalized 2026-04-18 with integration testing + page-loading + parentId fixes
  source: https://api.github.com/repos/arinspunk/claude-talk-to-figma-mcp
  source_date: 2026-06-08
  confidence: high
  relevance: Smaller fork (~9% grab stars) but actively shipped through April; cherry-pick worth more than re-forking
  contradicts: n-a

- finding: arinspunk recently bumped zod to ^3.25.0 to align with @modelcontextprotocol/sdk@latest, fixing tools/list "Cannot read properties of undefined"
  source: https://github.com/arinspunk/claude-talk-to-figma-mcp
  source_date: 2026-06-08
  confidence: medium
  relevance: Mirror this pin to avoid the same bug
  contradicts: n-a

- finding: Figma Reaction shape — { action?: Action (deprecated), actions?: Action[], trigger: Trigger | null }
  source: https://developers.figma.com/docs/plugins/api/Reaction/
  source_date: 2026-06-08
  confidence: medium
  relevance: get_reactions must serialize actions[] (not action) and treat singular as legacy fallback
  contradicts: brief §5.2 sample ("transitions") — Figma uses actions

- finding: Figma Trigger union — ON_CLICK/ON_HOVER/ON_PRESS/ON_DRAG/ON_MEDIA_END (no payload); AFTER_TIMEOUT { timeout }; MOUSE_UP/DOWN { delay }; MOUSE_ENTER/LEAVE { delay, deprecatedVersion }; ON_KEY_DOWN { device, keyCodes }; ON_MEDIA_HIT { mediaHitTime }
  source: https://developers.figma.com/docs/plugins/api/Trigger/
  source_date: 2026-06-08
  confidence: medium
  relevance: Defines exhaustive list for ReactionSpec union; filter controller devices (XBOX_ONE/PS4/SWITCH_PRO) — irrelevant to web/React
  contradicts: n-a

- finding: Figma Action variants — BACK, CLOSE, URL, UPDATE_MEDIA_RUNTIME, SET_VARIABLE, SET_VARIABLE_MODE, CONDITIONAL, NODE; only NODE carries Transition
  source: https://developers.figma.com/docs/plugins/api/Action/
  source_date: 2026-06-08
  confidence: medium
  relevance: Animation extraction in get_reactions only matters for NODE actions
  contradicts: n-a

- finding: Figma Transition — SimpleTransition { type: DISSOLVE|SMART_ANIMATE|SCROLL_ANIMATE; easing; duration } OR DirectionalTransition { type: MOVE_IN/OUT|PUSH|SLIDE_IN/OUT; direction; matchLayers; easing; duration }
  source: https://developers.figma.com/docs/plugins/api/Transition/
  source_date: 2026-06-08
  confidence: medium
  relevance: Field name "duration" not "durationSec"
  contradicts: brief §5.2 ("durationSec")

- finding: Figma Easing exposes spring physics directly — CUSTOM_SPRING { mass, stiffness, damping, initialVelocity }; named presets GENTLE/QUICK/BOUNCY/SLOW alongside EASE_IN/OUT/LINEAR/back variants and CUSTOM_CUBIC_BEZIER
  source: https://developers.figma.com/docs/plugins/api/Transition/
  source_date: 2026-06-08
  confidence: medium
  relevance: Brief §5.2 assumption "spring stiffness/damping NOT exposed" is wrong; 1:1 mapping to Framer Motion possible; downgrade brief §8 risk row "Spring presets don't map 1:1"
  contradicts: brief §8 risk register

- finding: documentAccess dynamic-page GA 2025-02-21; pages loaded only when navigated, async APIs (loadAsync, findAllAsync) required for off-page nodes
  source: https://developers.figma.com/docs/plugins/migrating-to-dynamic-loading/
  source_date: 2026-06-08
  confidence: medium
  relevance: Traversal in get_reactions and review_node must use *Async with loadAsync before crossing page boundaries
  contradicts: n-a

- finding: CVE-2025-53967 is command-injection RCE in figma-developer-mcp (Framelink) ≤0.6.2 via child_process.exec with unsanitized URL; CVSS 7.5; patched 0.6.3 (2025-09-29); Imperva disclosure July 2025
  source: https://github.com/advisories/GHSA-gxw4-4fc5-9gr5
  source_date: 2026-06-08
  confidence: corroborated
  relevance: Different project from grab; same threat class (exec on attacker-controlled strings) applies universally — audit forked tree, prefer execFile
  contradicts: n-a

- finding: CVE-2025-53967 exploit path is indirect prompt injection — Figma file content reaches MCP server which runs exec
  source: https://thehackernews.com/2025/10/severe-figma-mcp-vulnerability-lets.html
  source_date: 2025-10-15
  confidence: corroborated
  relevance: get_reactions/review_node return Figma-originated strings — never feed to shell/eval/dynamic require/HTML without escaping; affects DSL choice for rules.json (OQ §9.3)
  contradicts: n-a

- finding: @modelcontextprotocol/sdk current stable 1.29.0 (2026-03-30); 2.0.0-alpha.1/alpha.2 (2026-04-01) breaking — JSON-RPC -32602 for unknown tools, tasks moved to capabilities.tasks, zod removed from peerDependencies, deprecated .tool/.prompt/.resource signatures removed; stable 2.0 ETA 2026-07-28
  source: https://registry.npmjs.org/@modelcontextprotocol/sdk
  source_date: 2026-06-08
  confidence: corroborated
  relevance: Pin 1.29.0 for M1; deliberate v2 migration after M3; re-verify before M2 (70 days old, past 30-day soft threshold)
  contradicts: n-a

- finding: MCP TypeScript SDK supports stdio (StdioServerTransport) and Streamable HTTP (WebStandardStreamableHTTPServerTransport); HTTP+SSE retained for backward compat only
  source: https://github.com/modelcontextprotocol/typescript-sdk
  source_date: 2026-06-08
  confidence: medium
  relevance: Both transports first-class with one SDK; stack.md "both on day one" holds
  contradicts: n-a

- finding: vite-plugin-singlefile canonical for inlining Vite React bundle into ui.html for Figma plugins; multiple boilerplates (iGoodie/figma-plugin-react-vite, flexcodelabs, planetabhi)
  source: https://github.com/iGoodie/figma-plugin-react-vite
  source_date: 2026-06-08
  confidence: corroborated
  relevance: Use viteSingleFile() in vite.config for packages/plugin/ui; separate vite.config.ui.ts + vite.config.plugin.ts
  contradicts: n-a

- finding: networkAccess gotchas — allowedDomains CSP-enforced; ws:// blocked from HTTPS plugin context (wss:// required); WSS with explicit port fails manifest validation; mixed-content blocks ws://localhost over HTTPS Figma
  source: https://forum.figma.com/ask-the-community-7/plugin-websocket-connection-issue-23028
  source_date: 2026-06-08
  confidence: medium
  relevance: Figma Desktop loads plugin over http://, so ws:// works; Figma web breaks under CSP; document Desktop as required
  contradicts: brief §7.2 manifest snippet — works Desktop, breaks web

- finding: ws library current Node WebSocket standard; Node 22 ships stable native WebSocket; recommended 30s ping, 35s client timeout, exponential-backoff reconnect
  source: https://github.com/websockets/ws
  source_date: 2026-06-08
  confidence: medium
  relevance: Confirms stack.md ws + Node 22; baseline heartbeat — ws.ping 30s, drop on missed pong 35s, reconnect 1s→2s→4s→8s→max
  contradicts: n-a

- finding: grab channel-ID routing — channel ID identifies plugin instance, multi-client supported
  source: https://github.com/grab/cursor-talk-to-figma-mcp
  source_date: 2026-06-08
  confidence: low
  relevance: OQ §9.4 depends on channel-ID semantics; verify whether channel space global or per-MCP via src/socket.ts read by exec-agent before M1 closes
  contradicts: n-a

- finding: status no-results-found — direct side-by-side grab vs arinspunk diff
  source: n-a
  source_date: 2026-06-08
  confidence: unverified
  relevance: Web returns READMEs not diffs; exec-agent clones both, runs git log + tokei + tools/* manifest diff before final fork-base decision
  contradicts: n-a
```

---

**Status:** `consilium-complete`. Human gate required before `/implementor`.
