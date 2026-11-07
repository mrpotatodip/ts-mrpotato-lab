# CLAUDE.md

Elise: a pnpm workspace. A Worker clones a public GitHub repo into a Cloudflare sandbox, runs a Claude Code security audit, keeps the report in R2 and records scans in Neon.

## Map

- `apps/elise-engine-api` — the Worker (Hono, Effect, better-auth). Domain terms: `apps/elise-engine-api/GLOSSARY.md`
- `apps/elise-frontend-web` — the dashboard (TanStack Start); not yet on this API
- `packages/db-elise` — Drizzle schema, Neon client, migrations. Rules: `packages/db-elise/README.md`
- `packages/contracts` — Zod schemas shared by API and frontend (`@repo/contracts/elise`)
- `packages/chat-bot*` — chat-bot runtime, API and React UI; left over from Amelie, not used by the engine

## Commands

```bash
pnpm check                                   # tsc, oxlint and vitest for contracts, db-elise and the engine; the pre-commit hook runs it
pnpm --filter elise-engine-api dev           # wrangler dev
pnpm --filter @repo/db-elise db:query "..."  # read-only SQL on the live Neon database
pnpm --filter @repo/db-elise db:rehearse     # pending migrations in a rolled-back transaction
pnpm --filter @repo/db-elise db:migrate      # live Neon database: ask first
```

## Conventions

- Review rules live in `CODING_STANDARDS.md`; it points to one file per scope under `docs/standards/`.
- `{ data, error }` is the response envelope: success has `error: null`, failure has `data: null`.
- `#/*` maps to `./src/*` inside an app.
- Branch names start with the project folder: `elise-engine-api/feat/...`; the hook checks them.

## Agent skills

Issue tracker and triage labels: `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`. Domain docs: `GLOSSARY-MAP.md` and `docs/agents/domain.md`.
