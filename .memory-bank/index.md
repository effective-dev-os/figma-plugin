# Figma Agent Plugin — Memory Bank

> Last updated: 2026-06-08
> Phase: M0 — pre-flight. Next: `/pre-feature` on M1 (Plugin MVP).

## Product Overview
- [Vision](product-overview/vision.md) — purpose, audience, MVP DoD, what we don't do
- [Brief (2026-06-08)](product-overview/brief-2026-06-08.md) — full cause-and-effect picture for the consilium
- [Milestones](product-overview/milestones.md) — M0..M6 derived from brief §10
- [Anti-Stories](product-overview/anti-stories.md) — out-of-scope (brief §11)

## Steerings
- [Project Rules](steerings/project-rules.md) — TBD: stack rules, lint, file size caps
- [Validation Pipeline](steerings/validation-pipeline.md) — TBD: how Playwright + getAnimations gate works

## Tech Details
- [Stack](tech-details/stack.md) — React + Vite (plugin), Node + TS (server/relay), pnpm workspaces, Playwright
- [Architecture](tech-details/architecture.md) — TBD: topology + data flow (brief §4)
- [Data Contracts](tech-details/data-contracts.md) — TBD: `mapping.json`, reactions JSON, `rules.json` (brief §5)
- [Reference Repos](tech-details/reference-repos.md) — TBD: grab/cursor-talk-to-figma-mcp + arinspunk fork

## Open Questions
See [`.assistant/open-questions.md`](../.assistant/open-questions.md). 10 questions seeded from brief §9 + risk register.

## Decisions
See [`.assistant/decisions.md`](../.assistant/decisions.md). D-001 install, D-002 stack, D-003 rules DSL (proposed).
