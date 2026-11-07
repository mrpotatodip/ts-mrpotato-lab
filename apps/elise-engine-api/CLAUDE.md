# elise-engine-api

The scan Worker. Terms: `GLOSSARY.md`. Rules: `docs/standards/hono.md`, `docs/standards/effect.md`, `docs/standards/database.md`. Routes are mounted in `src/index.ts`.

- Two ways into `/scans/*` (`src/lib/require-scan-access.ts`): the shared `SCAN_API_TOKEN` plus an `x-account-id` the caller vouches for (the dashboard server), or a signed-in session whose user holds a Role in that account. `/auth`, `/sign-up` and `/me` check for themselves.
- A scan runs as Workflow -> `ScanSandbox` Durable Object -> container (`Dockerfile`, which bakes in `skills/*`). The Anthropic key stays in the Worker: the container reaches the network only through `Outbound`.
- Neon is the record of every scan (`scans`, `scan_files`, `scan_findings` in `packages/db-elise`): the API reads state, usage and file names only from there. R2 holds the file bytes under the account and Scan ID, and each object has a `scan_files` row with its key and size, so nothing in the bucket is untracked. Only the names in `SCAN_SERVABLE_FILES` are served.
- `skills/*` are the scan agent's prompts, so every line costs tokens on every scan. The dashboard parses the `findings.json` they define (`elise-frontend-web/.../finding-schemas.ts`): change both together.
- Request and response shapes live in `@repo/contracts/elise`. Responses use the `{ data, error }` envelope.
- Local: `wrangler dev` needs Docker for the container. Secrets: `ANTHROPIC_API_KEY`, `SCAN_API_TOKEN`, `DATABASE_URL`, `AUTH_SECRET`. `MAX_BUDGET_USD` is a ceiling a request may lower, never raise.
- `pnpm check` is `tsc`, oxlint and vitest. The oxlint `anti-slop` rules are strict: lint right after the first edit.
