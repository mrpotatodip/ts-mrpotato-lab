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
pnpm check:apps                              # tsc, oxlint and vitest for every project: one line on success, the tail of each failure; the pre-commit hook runs the changed ones
pnpm dev                                     # engine (8787) and dashboard (3100) together; first run: copy `.dev.vars.example` to `.dev.vars` in both apps (engine `DATABASE_URL`: `packages/db-elise/.env`). Up when `curl -s -o /dev/null -w "%{http_code}" localhost:8787/me` prints 401
pnpm --filter elise-engine-api dev:log       # wrangler dev, output teed to apps/elise-engine-api/.dev.log (the dashboard has the same `dev:log`)
pnpm dev:stop                                # free ports 8787 and 3100 from stale servers
node scripts/check-changed.mjs               # the pre-commit check: only the projects with staged changes (`check:apps` runs all nine)
pnpm --filter <app> run deploy               # live Worker: ask first. `pnpm deploy` is pnpm's own command. Ships the working tree, so it refuses uncommitted edits under the app or `packages/` (`ALLOW_DIRTY_DEPLOY=1` overrides)
pnpm -s --filter @repo/db-elise db:query "..."  # read-only SQL on the live Neon database; `-s` leaves only the rows in the output
pnpm -s --filter elise-engine-api live:get /repos <accountId>   # GET one route of the app in-process against the live database: read only, no token
pnpm engine:probe /repos                     # the raw JSON the DEPLOYED Worker sends (`--local` for port 8787); needs its SCAN_API_TOKEN secret in the env
pnpm scan:run https://github.com/o/n --ref BRANCH   # start a lite scan on the deployed Worker, wait, print status, cost and findings: costs real money, ask first
pnpm --filter @repo/db-elise db:rehearse     # pending migrations in a rolled-back transaction
pnpm --filter @repo/db-elise db:migrate      # live Neon database: ask first
pnpm --filter @repo/db-elise db:exec "..."   # one write statement in a transaction (--dry rolls back): live database, ask first
NEW_PASSWORD=... pnpm --filter @repo/db-elise db:set-password --email x   # live database, ask first
```

## Conventions

- Review rules live in `CODING_STANDARDS.md`; it points to one file per scope under `docs/standards/`.
- `{ data, error }` is the response envelope: success has `error: null`, failure has `data: null`.
- Request and response shapes both apps use live in `@repo/contracts/elise`: import them, don't redefine them.
- Is a field or route deployed? Run `pnpm engine:probe <path>`; the dashboard working once proves nothing. Contract changes follow the deploy order in `docs/standards/contracts.md` section 5; read it before any deploy that touches `packages/contracts`.
- `zod` is pinned to `4.4.3` in the root pnpm overrides, so every package shares one copy.
- `#/*` maps to `./src/*` inside an app.
- Branch names start with the project folder: `elise-engine-api/feat/...`; the hook checks them.

## Agent skills

Issue tracker and triage labels: `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`. Domain docs: `GLOSSARY-MAP.md` and `docs/agents/domain.md`.
