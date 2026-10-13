# amelie-engine-api

Backend for Amelie, an AI customer assistant that answers a small business's customer questions from that business's own information. Hono on Cloudflare Workers, backed by its own Neon database through `@repo/db-amelie`.

- Glossary: [GLOSSARY.md](./GLOSSARY.md)
- MVP spec: [.scratch/customer-assistant/PRD.md](./.scratch/customer-assistant/PRD.md)

## Local setup

1. Copy `.dev.vars.example` to `.dev.vars` and fill it in.
2. Point the two Hyperdrive bindings at the Neon database for local dev (the dev server reads these from your shell or a `.env` file, not `.dev.vars`):

   ```bash
   export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgresql://…neon.tech/amelie?sslmode=require"
   export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE_REALTIME="$CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE"
   ```

3. Migrate and seed the database (put `DATABASE_URL` and `SEED_OWNER_PASSWORD` in `packages/db-amelie/.env`):

   ```bash
   pnpm --filter @repo/db-amelie db:migrate
   pnpm --filter @repo/db-amelie db:seed   # Sorella Cafe + owner@sorella.test
   ```
4. Run it: `pnpm --filter amelie-engine-api dev` (port 8788)

## Commands

```bash
pnpm --filter amelie-engine-api dev    # cf dev on :8788
pnpm --filter amelie-engine-api test   # vitest
pnpm --filter amelie-engine-api lint   # oxlint
```

## API docs

Run the dev server, then open `http://localhost:8788/docs`. It is a [Scalar](https://scalar.com) page that reads `http://localhost:8788/openapi.json`: read each route and use "Test Request". For a signed-in route, paste the session token from `POST /auth/sign-in/email` once, in the Authentication panel. Both routes are a 404 unless `ENVIRONMENT=development`. Each route has a context, the steps it follows and one `curl` example.

## Routes

| Route | Purpose |
|---|---|
| `GET /health` | Health check |
| `GET /docs` | The OpenAPI spec as a page you can read and try (Scalar). Same dev-only rule |
| `GET /openapi.json` | The OpenAPI spec of every route below (except `/auth/*`). Dev only: a 404 unless `ENVIRONMENT=development` in `.dev.vars` |
| `/auth/*` | better-auth sign-in, sign-out, session (no better-auth sign-up) |
| `POST /public/sign-up` | Invite-only sign-up: using an invite code from the `invite_codes` table (entry ignores case, dashes and spaces; create one through the admin invite-code API) is the first step of the same transaction, which creates the Person, login, Organization, Tenant, its three Roles (owner, manager, staff) and the creator's owner Party role, and records an `invite_code_redemptions` row. Body `{ inviteCode, firstName, lastName, email, password, cafeName, timezone, website? }`. Email verification is off for now. Limited to 5 attempts a minute per IP (`SIGN_UP_LIMITER`, set in `cloudflare.config.ts`); over the limit the answer is the same 403 `Invalid invite code` a wrong, revoked, expired or used-up code gets. Not limited when the binding is absent (local dev) |
| `GET /tenants` | Tenants where the signed-in Person has a Party role, with the role key and `canEdit` |
| `GET /tenants/:tenantId` | One of those Tenants; 404 if the Person has no Party role there |
| `/chat-bot/*?tenantId=` | Signed-in chat bot, scoped to a Tenant the Person belongs to |
| `POST /public/chat-bot` | Widget: stream a Customer's turn. Body `{ slug, threadId?, content }`, header `X-Anonymous-Id` |
| `GET /public/chat-bot?slug=&threadId=` | Widget: hydrate a thread or rejoin its stream, header `X-Anonymous-Id` |
