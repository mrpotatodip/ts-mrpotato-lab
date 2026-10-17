# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

pnpm workspace with two layers:

- `apps/` — runnable applications
  - `amelie-engine-api` — Amelie backend (Hono on Cloudflare Workers): auth, tenants, menu, FAQs, chat bot, public widget. Domain terms: `apps/amelie-engine-api/GLOSSARY.md`
  - `amelie-engine-api-2-0` — the chat bot alone, wired onto `@repo/chat-bot-api` (a minimal host; start at `src/chat-bot.ts`); port 8789
  - `chat-bot-example-notes` — a second, non-Amelie host of `@repo/chat-bot-api`; its test fails if the engine drags in Amelie code
  - `chat-bot-example-notes-start` — the notes assistant inside a TanStack Start app with the engine copied into `src/vendor` (no `@repo` dependencies)
  - `amelie-frontend-web` — cafe owner dashboard and public customer chat (TanStack Start + React 19)
  - `amelie-frontend-host` — stand-in cafe website for embedding the Customer widget (`http://localhost:5174`)
- `packages/` — shared libraries
  - `@repo/db-amelie` — Drizzle ORM schema + Neon client (single source of truth for Amelie DB types)
  - `@repo/contracts` — Zod schemas shared between the API and frontend (`amelie/` and `chat-bots/` families; the generic chat-bot protocol lives in `@repo/chat-bot-api/contracts` and is re-exported here)
  - `@repo/chat-bot` — chat-bot runtime used by the frontend
  - `@repo/chat-bot-react` — React chat UI for the engine (`<ChatBot />`, hooks, CSS)
  - `@repo/chat-bot-react-loader` — optional step-by-step progress display (the AG-UI loader, plain CSS) for `chat-bot-react`
  - `@repo/chat-bot-api` — domain-free chat-bot engine (threads, runs, streaming, tools) behind a storage port; see its README
  - `@repo/chat-bot-durable-stream` — Durable Object stream helpers used by the API

This repo is an amelie-only lab copy of `ts-clarice`. Clarice and Elise apps are not present.

## Commands

```bash
# Root (all apps)
pnpm dev            # run all apps in parallel
pnpm build          # build all

# Per-app
pnpm --filter amelie-engine-api dev      # cf dev --port 8788
pnpm --filter amelie-frontend-web dev    # vite dev --port 3000
pnpm --filter amelie-frontend-host dev   # vite --port 5174, loads widget.js from :3000
pnpm --filter amelie-engine-api test     # vitest run
pnpm --filter amelie-engine-api lint     # oxlint src
UPDATE_POWER_USAGE=1 pnpm --filter amelie-engine-api test   # rewrites ACCESS_POWER_USAGE (where each Power is checked) after a requirePower change

# Database
pnpm --filter @repo/db-amelie db:generate  # drizzle-kit generate migration
pnpm --filter @repo/db-amelie db:migrate   # applies to the DATABASE_URL in that package's .env, a remote Neon database: ask before running
pnpm --filter @repo/db-amelie db:studio    # drizzle-kit studio
pnpm --filter @repo/db-amelie db:seed      # tsx src/seed.ts
pnpm --filter @repo/db-amelie db:sync-powers  # adds catalogue Powers missing from access_master_powers (never deletes)
```

## Architecture: `amelie-engine-api`

Hono on Cloudflare Workers. Public REST and widget routes, plus signed-in dashboard APIs. Data goes through `@repo/db-amelie`. Chat-bot agents and tools live under `src/modules/chat-bot/`.

Dev server: `http://localhost:8788`. OpenAPI/Scalar at `/docs` when `ENVIRONMENT=development`.

## Architecture: `amelie-frontend-web`

TanStack Start (SSR) + TanStack Router + TanStack Query + Tailwind CSS v4 + shadcn/ui.

**Module layout** (`src/modules/`): `dashboard`, `menu`, `faq`, `chat-bot`, `auth`, and related feature folders.

Each module follows this structure:

```
{module}/
├── schema/schemas.ts
├── types/index.ts
├── api/
├── hooks/
├── components/
└── index.ts
```

**API layer:** All server calls go through `src/lib/api-client.ts`.

**Naming conventions:**
- Files: `{module}-{thing}.ext`
- Symbols: `{Module}{Thing}`
- Query keys: `{module}Keys`

**Routes** (`src/routes/`): file-based via TanStack Router. `routeTree.gen.ts` is auto-generated — do not edit manually. Run the dev server to regenerate after adding routes.

## Architecture: `@repo/db-amelie`

Drizzle ORM with Neon serverless Postgres. Schema files are in `src/schema/`, migrations in `migrations/`. Import DB types via `@repo/db-amelie`.

## Architecture: `@repo/contracts`

Zod v4 schemas and TypeScript types shared between `amelie-engine-api` and `amelie-frontend-web`. Import from `@repo/contracts/amelie` or `@repo/contracts/chat-bots`.

## Key Conventions

- Review-time rules for Hono route code, the React app, `@repo/contracts` and chat-bot agents, agent tools and the agent router (`{module}/agents/`, `{module}/agent-tools/`, `{module}/agent-router/`) live in `CODING_STANDARDS.md` (root)

- `#/*` path alias maps to `./src/*` in the amelie apps
- All Hono apps run on Cloudflare Workers; use `@cloudflare/workers-types` for `ExecutionContext`, `MessageBatch`, etc.
- `drizzle-orm` is pinned to `0.45.2` via root pnpm overrides
- `zod` v4 is used in the amelie apps and `@repo/contracts`
- Response envelope convention: `{ data: T | null, error: { code: string, message: string } | null }` — success has `error: null`, errors have `data: null`

## Agent skills

### Issue tracker

This lab copy has no GitHub remote yet. Specs (PRDs) live per-project as local markdown under `apps/<project>/.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

`GLOSSARY-MAP.md` at the root points to `apps/amelie-engine-api/GLOSSARY.md`. See `docs/agents/domain.md`.
