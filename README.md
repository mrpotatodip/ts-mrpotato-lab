# EliseLAB

EliseLAB runs a Claude Code security audit on a GitHub repo and keeps the report. You give it a repo URL. A Worker clones the repo into a Cloudflare sandbox, the agent reads the code and writes `findings.json` and a report, and the dashboard shows the result.

Public repos work with no setup. Private repos need the GitHub App installed on the account (`docs/adr/0005-private-repos-github-app.md`).

## How a scan runs

1. The dashboard (or any client holding the API token) asks the engine to start a scan.
2. A Workflow starts a `ScanSandbox` Durable Object, which starts a container with the audit skills baked in.
3. The container has no direct network access. Its model calls go through the Worker, which adds the Anthropic key. The key never enters the container.
4. Findings and cost go to Neon. Report files go to R2 under the account and scan ID.

An account can store its own Anthropic key. Without one, scans use the platform key.

## Layout

| Path | What it is |
| --- | --- |
| `apps/elise-engine-api` | The Worker: Hono, Effect, better-auth. Scans, accounts, teams, billing. |
| `apps/elise-frontend-web` | The dashboard: TanStack Start, port 3100. It calls the engine from server functions only. |
| `apps/elise-runner-cli` | EliseLAB Runner, a Tauri desktop app that runs scans on your own computer with your own Claude Code. |
| `packages/db-elise` | Drizzle schema, Neon client, migrations. |
| `packages/contracts` | Zod schemas for every request and response both apps share. |
| `packages/chat-bot*` | Chat-bot runtime, API, React UI and durable stream. Kept on purpose, see `docs/adr/0001-keep-chat-bot-packages.md`. |

## Run it locally

You need Node, pnpm 10 and Docker (the sandbox container).

```bash
pnpm install
cp apps/elise-engine-api/.dev.vars.example apps/elise-engine-api/.dev.vars
cp apps/elise-frontend-web/.dev.vars.example apps/elise-frontend-web/.dev.vars
pnpm dev
```

Fill in `.dev.vars` in both apps. The engine's `DATABASE_URL` comes from `packages/db-elise/.env`. The engine is up when this prints `401`:

```bash
curl -s -o /dev/null -w "%{http_code}" localhost:8787/me
```

The engine runs on 8787 and the dashboard on 3100. `pnpm dev:stop` frees both ports if a server is left over.

Scans fail in local `wrangler dev` on Apple Silicon with `RangeError: Out of memory`. Test scans against a deployed Worker. `docs/ops.md` has the details.

## Check your work

```bash
pnpm check:apps
```

This runs `tsc`, oxlint and vitest for every project and prints one line per project on success, or the tail of each failure. The pre-commit hook runs the same checks on the projects you changed.

## Contributing

- Branch names start with the project folder, such as `elise-engine-api/feat/short-name`. A hook checks this.
- `CLAUDE.md` lists the commands and conventions. Each app has its own `CLAUDE.md`.
- `CODING_STANDARDS.md` points to one standards file per scope under `docs/standards/`.
- Shared request and response shapes go in `@repo/contracts/elise`. Import them, don't redefine them.
- Responses use the `{ data, error }` envelope. Success has `error: null`, failure has `data: null`.
- Terms are defined in `GLOSSARY-MAP.md` and the glossary of each context.
- Deploys touch the live Worker. Ask first, and read `docs/standards/contracts.md` section 5 if the change touches `packages/contracts`.

## Decisions

Architecture decision records are in `docs/adr/`: Repo history and team management, the ship verdict, Repo branches, private repos through the GitHub App, and the chat-bot packages.
