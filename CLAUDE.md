# Figma Agent Plugin

Figma plugin + local MCP bridge + design-reviewer agent. Makes any Figma file ready-for-dev and AI-codegen-ready **without** Figma Code Connect (which gates on Organization plan, $55/editor/mo). Works on Professional plan.

**PROJECT_TYPE:** 2 (production — replicable process sold to design partners after Ony pilot)
**Primary stack:** Web frontend (TypeScript + React + Vite), Node.js backend (TypeScript + MCP SDK), Playwright E2E

## Entry points

- Brief (cause-and-effect picture): `.memory-bank/product-overview/brief-2026-06-08.md`
- Working agreement: `AGENTS.md` (philosophy, hard-stops, validation pipeline)
- Project knowledge: `.memory-bank/index.md`
- Working memory (rules, decisions, open questions): `.assistant/`
- Hard rules every agent respects: `.assistant/INVARIANTS.md`

## Sources of truth (priority order)

1. `.assistant/INVARIANTS.md`
2. `AGENTS.md`
3. `.memory-bank/index.md`
4. This file (short entry point)

## Repo layout (target)

```
figma-agent-plugin/
├── packages/
│   ├── plugin/          # Figma plugin (React + Vite). figma.* API client, WS client → :3055
│   ├── mcp-server/      # MCP stdio + HTTP. @modelcontextprotocol/sdk
│   ├── relay/           # WS relay :3055. ws lib. Channel-ID routing
│   └── shared/          # Shared TS types: NodeMeta, ReactionSpec, MappingEntry, RuleResult
├── .figma/
│   ├── mapping.json     # Code Connect substitute (per-file)
│   └── rules.json       # Ready-for-dev reviewer rules
├── package.json         # pnpm workspaces
└── pnpm-workspace.yaml
```

## Agents

### Consilium
| Role | Agent |
|------|-------|
| architect | architect |
| frontend | frontend |
| ui | frontend |
| security | security |
| devops | devops |
| api | api |
| diagnostics | diagnostics |
| test | test |

### Executing
| Agent | Scope |
|-------|-------|
| frontend | packages/plugin/**/*.{ts,tsx,html,css} |
| web | packages/mcp-server/**/*.ts, packages/relay/**/*.ts, packages/shared/**/*.ts |
| backend | packages/mcp-server/**/*.ts |
| test | **/*.{test,spec}.ts, **/playwright/** |

### Models
| Role | Model |
|------|-------|
| architect | opus |
| security | opus |
| * | sonnet |

## Documentation language

English only for all checked-in files (memory bank, decisions, code, commits, PRs). Chat with the user may be any language; transcribe Russian utterances into English when persisting to disk.

## Current phase

M0 · Pre-flight. Next: `/pre-feature` on the M1 (Plugin MVP) milestone, see brief §10.
