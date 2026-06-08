# Anti-Stories — explicitly NOT in scope

From [brief-2026-06-08.md](brief-2026-06-08.md) §11. Each line = a thing the harness/agent must refuse to do until/unless explicitly re-scoped.

- Multi-file / library scan via Figma REST API. Deferred to M7+.
- Visual diff for static screens (Figma screenshot vs browser pixels). Playwright loop can do it, but not wired as a CI gate in pilot.
- Sketch / Framer / Adobe XD support. Figma only.
- Native iOS / Android codegen. Web/React only in v1.
- Non-React frontend stacks in `mapping.json` v1 schema. Add multi-stack support post-pilot.
- Full-text search / library subscription tracking. Official Figma MCP owns that surface.
- Code → Figma direction (i.e., `generate_figma_design`-style). Read-only from Figma; write only annotations.
- A `harness do "feature X"` CLI for this project. Per harness §1.1, no runtime CLI wrapper.

If a user asks for one of the above, the agent stops and points them at this file.
