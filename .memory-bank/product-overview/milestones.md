# Milestones

Derived from [brief-2026-06-08.md](brief-2026-06-08.md) §10. Status updated as each milestone progresses.

| ID | Name | Status | Effort | Notes |
|----|------|--------|--------|-------|
| M0 | Pre-flight | in-progress | — | Get `can_edit` from Ony; resolve open questions §9; pick pilot landing |
| M1 | Plugin MVP | pending | 7–10 dev-days | Port grab (D-007) + cherry-pick arinspunk; feature-flag writes (D-008); harden get_reactions + plugin-side deltas (D-006); get_code_mapping repo-file read (D-005); stdio+HTTP (D-004); packages/shared scaffold; security pre-audit (D-009). Acceptance gates: swarm-report/m1-acceptance.md |
| M2 | Code-gen loop | pending | 2–3 dev-days | Claude Code via `.mcp.json`; workflow doc; smoke test |
| M3 | Animation verification | pending | 2 dev-days | Playwright MCP wiring; `assertAnimation(locator, spec)`; frame-by-frame keyframes |
| M4 | Agent-reviewer MVP | pending | 3–5 dev-days | `rules.json` schema v1 (10–15 rules); `review_node`; HTML report; optional `set_annotation` |
| M5 | Pilot run with Ony | pending | 1 week | Full §6.2 loop; expand `rules.json`; metrics (hours, fidelity, FPs) |
| M6 | Docs + handoff | pending | — | README; sales asset; next-pilot decision |

## Out of pilot (brief §11)

Multi-file scan, native targets, non-React stacks, Sketch/XD/Framer, full-text DS search, code→Figma direction.

## Dependencies / blockers

- **M0 → M1:** Ony must grant `can_edit` access to pilot file before M1.
- **M1 → M2:** Plugin smoke test green on one demo frame.
- **M2 → M3:** Code-gen loop produces at least one component with declared motion.
- **M3 → M4:** Frame-by-frame keyframe assertion proven on one transition.
- **M4 → M5:** Reviewer HTML readable; `rules.json` v1 covers brief §6.4 categories.
