# Open Questions

> Questions whose answers are not yet committed. Each gets an ID. When answered, move the resolution to `decisions.md` and tick the OQ here.

---

## OQ-001 — MCP transport: stdio only, or stdio + HTTP?
**Status:** open
**Context:** Brief §9.1. Stdio = canonical Claude Code local. HTTP needed for remote agents (future, not pilot).
**Resolution lean:** ship both behind a flag from day one — SDK supports it cheaply. Confirm in M1 planning.

## OQ-002 — Mapping persistence: repo file vs Figma `sharedPluginData` vs hybrid?
**Status:** open
**Context:** Brief §5.1. File in repo = git-tracked, reviewable, CI-gatable. `sharedPluginData` = bound to file, no git noise. Hybrid = file is source of truth + plugin data mirror for in-Figma UI indicator.
**Resolution lean:** hybrid. CI gate verifies consistency.

## OQ-003 — `Reaction.deltas`: compute in plugin or send raw subtrees to agent?
**Status:** open
**Context:** Brief §5.2. Plugin-side diff = heavier plugin, lighter agent payload, deterministic. Agent-side diff = simpler plugin, larger token bill, drift risk.
**Resolution lean:** compute in plugin. Brief §4.3 motion path.

## OQ-004 — Spring presets (Gentle/Quick/Bouncy/Slow) → Framer Motion mapping
**Status:** open
**Context:** Figma exposes preset names, not stiffness/damping. Risk register row.
**Resolution lean:** calibrate visually against Figma recording, document mapping table in `.figma/rules.json` or a separate `motion-mapping.json`.

## OQ-005 — Concurrent agents on one WS channel
**Status:** open
**Context:** Brief §9.4. Multi-agent routing complicates relay; pilot needs only single agent.
**Resolution lean:** out of scope for M1–M5. Revisit if Ony loop needs parallel.

## OQ-006 — Reviewer output: HTML only, or +JSON for CI, +Figma annotations?
**Status:** open
**Context:** Brief §9.6. Pilot needs HTML for human review. CI JSON useful once we have a gate. Annotations need `can_edit`.
**Resolution lean:** HTML + JSON in M4. Annotations behind a flag.

## OQ-007 — Hot reload of `mapping.json` / `rules.json`
**Status:** open
**Context:** Brief §9.7. Cold restart is acceptable for pilot. fs.watch trivial later.
**Resolution lean:** v1 reads at MCP-tool-call time (no caching); v2 add LRU + watch.

## OQ-008 — Authentication between plugin and WS relay
**Status:** open
**Context:** Brief §9.8. Channel ID = routing, not auth. localhost-only by default.
**Resolution lean:** none for pilot; document risk; add HMAC if we ever bind to non-loopback.

## OQ-009 — Cross-file scan via Figma REST API and PAT storage
**Status:** open
**Context:** Brief §9.9. Out of pilot scope but on roadmap (library scans).
**Resolution lean:** defer to M7+. Store PAT in `.env`, never commit; `.gitignore` covers.

## OQ-010 — Cap on reviewer findings per node / per file
**Status:** open
**Context:** Risk register "performance on 1000+ frames". HTML report becomes unreadable.
**Resolution lean:** paginate report; top-N most severe per node.
