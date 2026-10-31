@AGENTS.md

# Vaultio

- Architecture and agent engine: `docs/ARCHITECTURE.md`. Reference-product research (page specs,
  API map, data model, design tokens, screenshots): `research/` on the `research` branch.
- UI text lives in `src/messages/en.json`; never hard-code user-facing strings in components.
- Design tokens are in `src/app/globals.css` (`text-ink`, `bg-canvas`, `border-line`, `text-brand`,
  `card`, `eyebrow`). The brand accent comes from the white-label config at runtime.
- Every agent job goes through `runAgentJob` and writes `agent_activities`; add new agents to
  `JOB_REGISTRY` (runner.ts) and, if recurring, `AGENT_SCHEDULE` (schedule.ts).
- Pages are server components reading `src/server/queries/*`; mutations are server actions in
  `src/server/actions/*` that check `getAppContext()` first.
- Never show made-up data: a feature without data shows its empty state.
