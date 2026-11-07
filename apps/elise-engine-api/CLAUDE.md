# elise-engine-api

The scan Worker. Terms: `GLOSSARY.md`. Rules: `docs/standards/hono.md`, `docs/standards/effect.md`, `docs/standards/database.md`. Routes are mounted in `src/index.ts`.

- Two ways into `/scans/*` (`src/lib/require-scan-access.ts`): the shared `SCAN_API_TOKEN` plus an `x-account-id` the caller vouches for (the dashboard server), or a signed-in session whose user holds a Role in that account. `/auth`, `/sign-up` and `/me` check for themselves.
- A scan runs as Workflow -> `ScanSandbox` Durable Object -> container (`Dockerfile`, which bakes in `skills/*`). The Anthropic key stays in the Worker: the container reaches the network only through `Outbound`.
- Neon is the record of every scan (`scans`, `scan_files`, `scan_findings` in `packages/db-elise`): the API reads state, usage and file names only from there. R2 holds the file bytes under the account and Scan ID, and each object has a `scan_files` row with its key and size, so nothing in the bucket is untracked. Only the names in `SCAN_SERVABLE_FILES` are served.
- `skills/*` are the scan agent's prompts, so every line costs tokens on every scan. The dashboard parses the `findings.json` they define (`elise-frontend-web/.../finding-schemas.ts`): change both together.
- Request and response shapes live in `@repo/contracts/elise`. Responses use the `{ data, error }` envelope.
- Local: `wrangler dev` needs Docker for the container. Secrets: `ANTHROPIC_API_KEY`, `SCAN_API_TOKEN`, `DATABASE_URL`, `AUTH_SECRET`. `MAX_BUDGET_USD` is a ceiling a request may lower, never raise.
- `pnpm check` is `tsc`, oxlint and vitest. The oxlint `anti-slop` rules are strict: lint right after the first edit.
- Side effects enter through `AppDeps` (`src/types/variables.ts`, real ones in `src/lib/app-deps.ts`): session lookup, role check, monthly spend, scan ledger. Route tests pass in-memory fakes (`src/__tests__/memory-scan-repo.ts`); query tests run on pglite with every migration (`src/__tests__/test-db.ts`). No module mocking: the lint bans it.
- Lint rules that bite on the first write: a route has no `try`/`catch`/`finally` (use `withPool` or a service); Promise work sits inline in `Effect.tryPromise({ try, catch })`, never in a bare `async`; an exported effect declares `Effect.Effect<A, E>`; a cast needs a `// SAFETY:` line.
- Usage numbers (`scans.cost_usd` and friends) come from the agent's own report, and the cost is an estimate: `docs/usage-cost.md` says how to check it.
