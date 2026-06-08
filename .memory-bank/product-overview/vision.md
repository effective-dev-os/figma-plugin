# Vision

## One-line

A Figma plugin + local MCP bridge + design-reviewer agent that makes any Figma file ready-for-dev and AI-codegen-ready without Figma Code Connect, working on the Professional plan.

## Why this exists

Three problems break Figma → code generation today (full picture in [brief-2026-06-08.md](brief-2026-06-08.md) §1):

1. **Hallucinated components.** Agent invents `<Button>` instead of importing the one already in `src/components/ui/button.tsx`. Code Connect solves this but gates on Organization plan ($55/editor/mo).
2. **Hallucinated layer names.** Default `Frame 427` slips into code as `<Frame427>`.
3. **Motion intent lost.** Official Figma MCP does not expose `node.reactions`. Smart Animate spec (duration, easing, what moves) is invisible.

Plus an upstream pain: no machine-checkable contract for "ready-for-dev".

## Target audience

1. **Internal — Effective.dev engineers** running the AI-codegen loop on Figma files produced by design partners.
2. **External — design studios partnering with us** (Ony is the pilot). The reviewer agent gives them automated feedback on the same ready-for-dev checklist we'd apply manually.
3. **Long-term — replicable process sold/given to other studios** as the partnership template scales.

## MVP Definition of Done (= end of M5, brief §10)

- Plugin loads in Figma Desktop via "Import from manifest", connects to local WS relay :3055, status badge green.
- MCP server exposes: `get_design_context`, `get_variables`, `get_components`, `get_annotations`, `get_reactions`, `get_code_mapping`, `review_node`.
- Pilot demo lands a code-gen loop where the agent only uses imports declared in `mapping.json` (zero hallucinated components) on a chosen custom landing.
- Animation verification passes: `getAnimations()` duration + easing assertions hold for one Smart Animate transition extracted via `get_reactions`.
- Reviewer prints an HTML report on the same landing; the design partner accepts ≥70% of findings as legitimate.
- `rules.json` v1 contains ≥10 rules from the ready-for-dev checklist.

## What we don't do

See [anti-stories.md](anti-stories.md) for the full out-of-scope list (brief §11). Highlights: not multi-file/library scans on pilot; not native iOS/Android targets; not non-React stacks in v1 mapping schema; not Sketch/XD/Framer.
