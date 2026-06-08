# Open Questions

> Questions whose answers are not yet committed. Each gets an ID. When answered, move the resolution to `decisions.md` and tick the OQ here.

---

## OQ-001 — MCP transport: stdio only, or stdio + HTTP?
**Status:** resolved 2026-06-08 → D-004
**Resolution:** stdio + HTTP day-one, HTTP binds 127.0.0.1, no auth (defers OQ-008).

## OQ-002 — Mapping persistence: repo file vs Figma `sharedPluginData` vs hybrid?
**Status:** resolved 2026-06-08 (M1 scope) → D-005
**Resolution:** M1 repo-file source-of-truth, read-only. `sharedPluginData` mirror deferred to M2.

## OQ-003 — `Reaction.deltas`: compute in plugin or send raw subtrees to agent?
**Status:** resolved 2026-06-08 → D-006
**Resolution:** compute in plugin. Property set v1: position, size, scale, opacity, fills, strokes, effects, cornerRadius, rotation.

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
**Status:** partial-resolution 2026-06-08 → D-004
**Resolution (M1):** none. HTTP/WS binds 127.0.0.1 only. Trust localhost.
**Still open (post-pilot):** HMAC token if/when binding to non-loopback interface.

## OQ-009 — Cross-file scan via Figma REST API and PAT storage
**Status:** open
**Context:** Brief §9.9. Out of pilot scope but on roadmap (library scans).
**Resolution lean:** defer to M7+. Store PAT in `.env`, never commit; `.gitignore` covers.

## OQ-010 — Cap on reviewer findings per node / per file
**Status:** open
**Context:** Risk register "performance on 1000+ frames". HTML report becomes unreadable.
**Resolution lean:** paginate report; top-N most severe per node.

---

## OQ-011 — Reaction shape naming in `packages/shared`: match Figma API verbatim?
**Status:** open
**Context:** Brief §5.2 sample uses `transitions[]` + `durationSec`. Figma API exposes `Reaction.actions[]` (deprecated singular `action`) + `Transition.duration` (seconds, no suffix).
**Resolution lean:** match Figma exactly (`actions`, `duration`). Lower translation cost, fewer mental hops. Confirm in M1 packages/shared scaffolding.

## OQ-012 — Plugin runtime support matrix: Figma Desktop only vs Desktop + web?
**Status:** open
**Context:** Brief §7.2 manifest uses `ws://localhost:3055`. Works in Figma Desktop (http://) only. Figma web (https://) blocks ws:// under CSP mixed-content. wss:// needs self-signed cert + manifest-validation workaround.
**Resolution lean:** Figma Desktop only for pilot. Document in M1 README. Web support deferred post-pilot.

## OQ-013 — MCP SDK v1 → v2 migration timing
**Status:** open
**Context:** Current stable `@modelcontextprotocol/sdk@1.29.0` (2026-03-30). v2.0 stable ETA 2026-07-28. v2 breaking: JSON-RPC `-32602` for unknown tools, `tasks` → `capabilities.tasks`, zod removed from peerDeps, deprecated `.tool/.prompt/.resource` signatures removed.
**Resolution lean:** pin 1.29.0 through M5. Deliberate v2 migration after M3 or post-pilot. Re-verify before M2 starts (INVARIANT §6).
