# Worker frontend

**Covers:** a TanStack Start app deployed as a Cloudflare Worker that holds secrets, bindings or a session, for example `elise-frontend-web`.

**Doesn't cover:** the React rules for components, routes and queries (React). Those apply as well.

| # | Section |
|---|---|
| 1 | [Worker frontend: Secrets and bindings](#1-worker-frontend-secrets-and-bindings) |
| 2 | [Worker frontend: Session and accounts](#2-worker-frontend-session-and-accounts) |

---

## 1. Worker frontend: Secrets and bindings

**1.1 `[House]` Read bindings and secrets inside the request, from `env` in `cloudflare:workers`.** Don't read them at module load, and don't build a database or auth client at module scope: on Workers they exist only during a request.

**1.2 `[House]` The browser never calls a service that needs a secret.** A server function calls it, and the secret stays in the Worker. Put the call in `{module}/api/` and keep the helper that attaches the secret in a server-only file in the same folder.

**1.3 `[House]` Declare every binding and secret in `wrangler.jsonc` and `.dev.vars.example`, then run `pnpm cf-typegen`.** The generated `worker-configuration.d.ts` is the only type source for `env`. Don't hand-write an `Env` type.

---

## 2. Worker frontend: Session and accounts

**2.1 `[House]` Every server function that touches user data starts with the session check.** Call `requireUser()` first. A route guard alone is not enough, because a server function is a public endpoint.

**2.2 `[House]` Take the account from the session, never from the input.** If the backend scopes data by an account id, send `user.id`. A request body or search param that names the account lets one user read another's data.

**2.3 `[House]` Keep sign-up closed unless the app needs it open.** When an account can spend money (a paid scan, an LLM call), gate sign-up behind a flag such as `ALLOW_SIGNUP`.
