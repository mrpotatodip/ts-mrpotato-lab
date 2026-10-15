# chat-bot-example-notes-start

The notes assistant inside a TanStack Start app, with the engine **copied into the app** instead of installed. There is no separate backend: the engine runs in a server route, and the page talks to it with `useChat`.

Nothing here depends on `@repo/*` or on this monorepo. `node_modules` has no `@repo` folder.

## Run it

```bash
cd apps/chat-bot-example-notes-start
cp .env.example .env        # put your OPENAI_API_KEY in it
pnpm dev                    # http://localhost:3010
```

## The copy-paste setup

What lives in the app:

| Folder | What it is |
|---|---|
| `src/vendor/chat-bot-api/` | Copy of `packages/chat-bot-api` (`src/` and its README) |
| `src/vendor/chat-bot-durable-stream/` | Copy of `packages/chat-bot-durable-stream` |
| `src/notes/` | The notes host (`app.ts`, `notes.ts`, `model.ts`), copied from `apps/chat-bot-example-notes` |

`scripts/vendor.sh` makes these copies (`pnpm vendor` to redo them). The copied code is **not edited**. Three things in the app make its imports resolve:

1. **`tsconfig.json` paths** map `@repo/chat-bot-api` and `@repo/chat-bot-durable-stream` (and their subpaths) to `src/vendor/...`:
   ```json
   "paths": {
     "@repo/chat-bot-api": ["./src/vendor/chat-bot-api/src/index.ts"],
     "@repo/chat-bot-api/*": ["./src/vendor/chat-bot-api/src/*"],
     "@repo/chat-bot-durable-stream": ["./src/vendor/chat-bot-durable-stream/src/index.ts"],
     "@repo/chat-bot-durable-stream/*": ["./src/vendor/chat-bot-durable-stream/src/*"]
   }
   ```
2. **`resolve.tsconfigPaths: true`** in `vite.config.ts`, so Vite (dev, build and the tests) follows them.
3. **The peer dependencies** the copied code needs, in `package.json`: `@tanstack/ai`, `effect`, `zod`, `hono` and `hono-openapi` (for the `/hono` routes), and `@tanstack/ai-openai` for the model.

Rename or drop the `@repo/` prefix if you like: change the paths and `sed` the imports in the copies.

**Left out of the copy** (they need `drizzle-orm` or `vitest`): the Postgres store and tables (`chat-bot-api/src/drizzle`), the store contract (`.../testing`), the Postgres stream log (`chat-bot-durable-stream`'s `server.ts`, `tables`, `pg-*`), and all tests. For production on Postgres, copy those back too and add `drizzle-orm`.

## How it fits

| File | What it does |
|---|---|
| `src/routes/api/chat.$.ts` | One splat server route for everything under `/api/chat`, including `/api/chat` itself. |
| `src/server/notes-host.ts` | Builds the notes host once, mounts it under `/api`, decides **who is calling** from a cookie (overwriting any identity headers the browser sends), and supplies the `waitUntil` the engine needs. |
| `src/routes/index.tsx` | The page: `useChat` with `fetchServerSentEvents("/api/chat")`. It keeps the `X-Thread-Id` of the first reply and names it in the URL after that. |

## Worth knowing

- **`waitUntil`.** On Node the process outlives the response, so a background job just runs. On Cloudflare, pass the platform's `waitUntil` in `notes-host.ts`.
- **Memory.** Threads, notes and the stream log live in the server's memory and reset on restart.
- **Updating.** The copies are snapshots. Re-run `pnpm vendor` here to pick up changes made in `packages/`; in your own project you would re-copy the folders by hand.
- **Request copy.** Start's `Request` can't be copied with `new Request(request, init)`; `withIdentity` builds a new one from its parts.
- **Tested:** `tsc`, 2 unit tests, `vite build`, and a live dev server with curl (send, thread per member, hydrate, replay, another member gets 404). **Not tested:** the page in a browser, and a real OpenAI answer.
