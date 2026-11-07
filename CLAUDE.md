# CLAUDE.md

Elise: a pnpm workspace. A Worker clones a public GitHub repo into a Cloudflare sandbox, runs a Claude Code security audit, keeps the report in R2 and records scans in Neon.

## Map

- `apps/elise-engine-api` — the Worker (Hono, Effect, better-auth). Its `CLAUDE.md` loads when you work there
- `apps/elise-frontend-web` — the dashboard (TanStack Start, port 3100). Its `CLAUDE.md` loads when you work there
- `packages/db-elise` — Drizzle schema, Neon client, migrations. Rules: `packages/db-elise/README.md`
- `packages/contracts` — Zod schemas shared by API and frontend (`@repo/contracts/elise`)
- `packages/chat-bot*` — chat-bot runtime, API, React UI and durable stream. Kept on purpose: `docs/adr/0001-keep-chat-bot-packages.md`

## Commands

```bash
pnpm check                                   # tsc, oxlint and vitest for contracts, db-elise, the engine and the dashboard (oxlint has strict custom `anti-slop` rules: run it after the first edit); the pre-commit hook runs it
pnpm check:apps                              # quiet form of the above for every app and package: one line on success, the tail of each failure. Prefer it
pnpm --filter elise-engine-api dev           # wrangler dev
pnpm --filter @repo/db-elise db:query "..."  # read-only SQL on the live Neon database
pnpm --filter @repo/db-elise db:rehearse     # pending migrations in a rolled-back transaction
pnpm --filter @repo/db-elise db:migrate      # live Neon database: ask first
```

## Conventions

- Review rules live in `CODING_STANDARDS.md`; it points to one file per scope under `docs/standards/`.
- `{ data, error }` is the response envelope: success has `error: null`, failure has `data: null`.
- Request and response shapes both apps use live in `@repo/contracts/elise`: import them, don't redefine them.
- `zod` is pinned to `4.4.3` in the root pnpm overrides, so every package shares one copy.
- `#/*` maps to `./src/*` inside an app.
- Branch names start with the project folder: `elise-engine-api/feat/...`; the hook checks them.

## Agent skills

Issue tracker and triage labels: `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`. Domain docs: `GLOSSARY-MAP.md` and `docs/agents/domain.md`.
