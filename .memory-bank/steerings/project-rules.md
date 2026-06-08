# Project Rules — non-negotiables

> Seeded 2026-06-08 from `/pre-feature m1-plugin-mvp` consilium (B-7). These are implicit rules in the brief made explicit so the reviewer agent gate has something to cross-check against.

## Scope

- **Figma only.** No Sketch, Adobe XD, Framer support. (anti-stories.md)
- **Web / React target only.** No iOS, Android, native codegen. (anti-stories.md)
- **Read-mostly plugin.** All write tools disabled by feature flag in M1 (D-008). `set_annotation` re-enabled by flag in M4. No new write surfaces without explicit decision in `decisions.md`.
- **Code → Figma direction is out of scope.** No `generate_figma_design`-style features. (anti-stories.md)

## Stack

- **Runtime:** Node 22 LTS + TypeScript. No Bun, no Deno. (D-002)
- **Plugin UI:** React + Vite. State: `useState` v1, Zustand if grows. No Redux/MobX. (D-002)
- **Monorepo:** pnpm workspaces. Packages: `plugin/`, `mcp-server/`, `relay/`, `shared/`. (D-002)
- **MCP SDK:** `@modelcontextprotocol/sdk` pinned `1.29.0` through M5. v2 migration deliberate post-pilot. (OQ-013)

## Transport + security

- **Local-loopback only.** All ports bind `127.0.0.1`. No `0.0.0.0` binds. (D-004)
- **No auth in pilot.** Channel ID = routing, not security. Trust localhost. (D-004 / OQ-008)
- **No `child_process.exec` with interpolated input.** Use `execFile`. Audit every shell-out for Figma-originated strings. (D-009 / CVE-2025-53967 precedent)
- **No `eval` / dynamic `require` of file content.** Figma node names/annotations are untrusted input.
- **No raw HTML rendering of node strings.** Escape always.

## Data hygiene

- **No secrets in `mapping.json`, `rules.json`, or any committed JSON.** (INVARIANT §12)
- **PAT (Figma REST API) stored in `.env`** — never committed. `.gitignore` covers. (OQ-009)
- **No node content in logs by default.** Only `id` + meta. Log files in `.gitignore`. (brief §8)

## Figma plugin runtime

- **`documentAccess: "dynamic-page"` mandatory.** Use async APIs (`loadAsync`, `findAllAsync`, `setCurrentPageAsync`). No sync cross-page access. (B-5)
- **Figma Desktop only for pilot.** `ws://localhost` blocked in Figma web under CSP. (OQ-012)
- **Manifest pinned to API 1.0.0.** Re-verify before each major release.

## Naming + types

- **Reaction shape mirrors Figma API verbatim.** `Reaction.actions[]`, `Transition.duration` (not `transitions[]`, not `durationSec`). (D-006 / OQ-011)
- **Shared types in `packages/shared`.** No type duplication between plugin and mcp-server.
- **Discriminated unions for `Trigger` + `Action`.** Filter out controller-device key triggers (XBOX_ONE/PS4/SWITCH_PRO).

## Documentation language

- **English only** for all checked-in files. Chat with user may be any language; transcribe to English when persisting. (CLAUDE.md)

## Process

- **No fork bypasses pre-feature consilium.** Brief §10 M0 mandates OQ resolution before milestone start. (B-1)
- **Decisions log is append-only.** Override = new dated entry, never edit. (INVARIANT §8)
- **External facts older than 30 days re-verified.** (INVARIANT §6)
