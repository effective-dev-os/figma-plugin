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
