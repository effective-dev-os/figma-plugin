# Stack

Locked in [`.assistant/decisions.md`](../../.assistant/decisions.md) D-002.

## Plugin UI — `packages/plugin/`

- **Language:** TypeScript (strict).
- **UI framework:** React 18+.
- **Build:** Vite. Output ES bundle that the Figma plugin sandbox loads via `ui.html`.
- **Types:** `@figma/plugin-typings`.
- **State management:** `useState` / `useReducer`. Promote to Zustand only if state graph outgrows hooks. Redux/MobX rejected (boilerplate cost > value).
- **Styling:** CSS modules or vanilla CSS. No Tailwind in v1 (plugin UI is tiny, Tailwind adds bundler complexity).
- **Plugin runtime:** Two contexts — `main.ts` (no DOM, has `figma.*` API) and `ui.tsx` (DOM, no `figma.*`). They `postMessage` each other. React lives in `ui.tsx`.

## Backend — `packages/mcp-server/` + `packages/relay/`

- **Language:** TypeScript (strict).
- **Runtime:** Node 22 LTS. `tsx` for dev, `tsc` to `dist/` for prod.
- **MCP SDK:** `@modelcontextprotocol/sdk` (official Anthropic, TS).
- **Transports:** stdio (Claude Code, OpenCode, Codex CLI) + HTTP (remote agents). Both on day one (cheap with SDK).
- **WS relay:** `ws` (lib). Listens on `localhost:3055`. Channel-ID routing per grab/cursor-talk-to-figma-mcp pattern.
- **No DB.** State is the Figma file + `.figma/mapping.json` + `.figma/rules.json` on disk. Mapping mirror in `sharedPluginData` (OQ-002).
- **Bun rejected:** MCP client compat untested broadly; stay on Node for pilot.

## Shared types — `packages/shared/`

Types referenced by all three packages:

- `NodeMeta` — id, name, type, layoutMode, variableRefs, annotations
- `ReactionSpec` — output of `get_reactions` (brief §5.2)
- `MappingEntry` — `mapping.json` row (brief §5.1)
- `RuleResult` — finding produced by `review_node`

Build via `tsc --build` references.

## Verification — Playwright

- `@playwright/test` for E2E.
- Custom helpers in `packages/plugin/e2e/` and `packages/mcp-server/e2e/`.
- Animation assertions via `element.getAnimations()` (MDN). Pause + screenshot keyframes; diff against ffmpeg-extracted Figma prototype recording frames.

## Monorepo

- **Package manager:** pnpm.
- **Workspaces:** `packages/*` via `pnpm-workspace.yaml`.
- **Single tsconfig base** with package-level overrides.
- **Lint:** ESLint + `@typescript-eslint`. Prettier for format.
- **Husky + lint-staged** for pre-commit. No `--no-verify` allowed (AGENTS.md hard-stop).

## TODO before M1 kickoff

- Pin exact Node version (`.nvmrc`).
- Confirm pnpm major (10.x).
- Decide CI provider (GitHub Actions assumed; Ony repo will mirror).
- Decide license / repo visibility (private for pilot).
