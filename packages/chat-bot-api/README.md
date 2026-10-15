# @repo/chat-bot-api

The chat-bot engine, with nothing about any one product in it: threads, runs, streaming that survives a dropped connection, tool calls, and a handoff from a main agent to specialists. A host plugs in who is chatting, where rows are kept, which agents answer, and how a failure becomes a response.

It does **not** do auth, rate limits, widgets or any domain tool. Those stay in the host.

## The plug points

| Plug | What the host gives | Where |
|---|---|---|
| Owner | `{ kind: "user" \| "anonymous", scopeId, userId \| anonymousId }`. `scopeId` is the host's unit of isolation (tenant, org, workspace). | per call |
| Store | A `ChatBotStore`, already bound to the host's database | `createChatBot({ store })` |
| Model | A `ChatBotRunner`: how a model name becomes an adapter, and an optional router | `createChatBotRunner({ adapterFor, route })` |
| Stream log | `durableStream(init)`, from `@repo/chat-bot-durable-stream` | `createChatBot({ durableStream })` |
| Services | Whatever a tool needs (db client, mailer, ...). Spread onto the runtime next to `owner` and `threadId`. | `createChatBot({ services })` |
| Agents and tools | Plain data: prompts, tools, subagents | per call |
| Failures | The engine fails with tagged errors (`DbError`, `NotFound`, `Invalid`, `Conflict`). The host maps them to HTTP. | the host's run point |

## A host in a page

```ts
import { createChatBot, createChatBotRunner, createChatBotToolFactory } from "@repo/chat-bot-api";
import { createMemoryChatBotStore } from "@repo/chat-bot-api/memory";

type Services = { db: Db };
const defineTool = createChatBotToolFactory<Services>();

const chat = createChatBot<Services>({
  store: createMemoryChatBotStore(),            // or your own, see below
  runner: createChatBotRunner({ adapterFor: (model) => openai(model) }),
  durableStream,                                // pg or memory, from @repo/chat-bot-durable-stream
  services: { db },
  waitUntil: (job) => ctx.waitUntil(job),
});

// POST: start (or find) the run and answer with its SSE stream
await Effect.runPromise(chat.stream({ agent, owner, body, request }));
// GET: hydrate a thread, or rejoin a live run when the request has an offset
await Effect.runPromise(chat.hydrateOrJoin({ owner, threadId, request }));
// threads
chat.threads.list(owner); chat.threads.get(owner, id); chat.threads.rename(owner, id, "x"); chat.threads.remove(owner, id);
```

Each call returns an `Effect`. Run it with your own run point and map the tagged failures the way your app already does.

## Routes, if you use Hono

```ts
import { createChatBotRoutes } from "@repo/chat-bot-api/hono";

app.route("/chat-bot", createChatBotRoutes({
  chat: (c) => chatFor(c),
  owner: (c) => ownerFrom(c),
  agent: () => mainAgent,
  run: runEffect,
  invalid: (message) => { throw new ValidationError(message); },
  docs: { stream: streamDoc },   // optional OpenAPI text per route
}));
```

Mount it behind your own auth. `hono` and `hono-openapi` are optional peers, needed only for this subpath.

## Postgres, without writing a store

If you use Postgres through Drizzle, `@repo/chat-bot-api/drizzle` is a ready-made `ChatBotStore`. It names no table of yours and has no foreign key into one: an owner is a `scopeId` plus a user id (or an anonymous id), whatever those are in your app.

```ts
// schema.ts: so drizzle-kit migrates the engine's four tables
import { createChatBotTables } from "@repo/chat-bot-api/drizzle/tables";
export const { threads: chatBotThreads, threadSessions, runs, messages } = createChatBotTables();

// per request
import { createDrizzleChatBotStore } from "@repo/chat-bot-api/drizzle";
const store = createDrizzleChatBotStore({ db, triggers: ["chat"], modules: ["chat"] });
```

- **No drizzle-kit?** Run [`sql/chat-bot-api.sql`](sql/chat-bot-api.sql). It is safe to run twice, and a test fails if it drifts from the tables.
- **Prefix:** `createChatBotTables("notes")` makes `notes_threads` and so on. Pass the same tables to `createDrizzleChatBotStore({ db, tables })`. In the SQL file, replace `chat_bot_`.
- **Options:** `triggers` and `modules` (the only values a thread may start with; omit to allow any), `anonymousIdleMs`, `anonymousHardCapMs`, `threadListLimit`.
- **Your own thread data** (a location, a project id) goes in `attrs` on the call. It is stored as JSON on the thread's session row.
- **Driver:** any Drizzle Postgres client (node-postgres, Neon, PGlite). `drizzle-orm` is an optional peer: only this subpath needs it.
- It passes the store contract below on a real Postgres engine (PGlite).

The streamed answer needs its own log to survive a dropped connection: use `pgChatBotDurableStream` from `@repo/chat-bot-durable-stream/server`, with the tables from `.../tables`.

## Bringing your own database

Implement `ChatBotStore` (see `src/types.ts`). Every method is bound to your database and takes the owner where a stranger must not see a row. Then run the contract once:

```ts
import { describeChatBotStoreContract } from "@repo/chat-bot-api/testing";

describeChatBotStoreContract("my store", async () => ({
  store: myStore(db),
  scopes: { a: scopeA, b: scopeB },
  users: { one: userOne, two: userTwo },
  start: { trigger: "chat", module: "chat" },
  refused: { trigger: "nope", module: "chat" },   // or null if you accept any
}));
```

The contract is what makes the engine's guarantees hold on your store: a thread is visible to its owner alone, a run id is taken once, a delete takes its runs with it. `createMemoryChatBotStore` passes it, and so does Amelie's Drizzle store (`apps/amelie-engine-api-2-0`).

Thread attributes the engine does not understand (Amelie's Location and Country) travel as `attrs` on the call and arrive in `store.insertThreadWithRun`.

## Use it in another project

Install the engine and the stream package, and the peers they share with you (one copy each, so types and `instanceof` agree):

```
@repo/chat-bot-api  @repo/chat-bot-durable-stream
@tanstack/ai  effect  zod            (peers, required)
hono  hono-openapi                   (peers, only for /hono)
drizzle-orm                          (only if you use the Postgres stream log or tables)
```

| Import | Brings in |
|---|---|
| `@repo/chat-bot-api` | The engine, plus the wire protocol (`ChatBotTurn`, `ChatBotStructure`, ...). No database, no HTTP framework. |
| `@repo/chat-bot-api/contracts` | Only the wire protocol: Zod schemas and types. Safe for a browser bundle. |
| `@repo/chat-bot-api/memory` | The in-memory store. |
| `@repo/chat-bot-api/hono` | The optional routes. |
| `@repo/chat-bot-api/drizzle` | The Postgres store (needs `drizzle-orm`). |
| `@repo/chat-bot-api/drizzle/tables` | Only the four Drizzle tables, for your migrations. |
| `@repo/chat-bot-api/testing` | The store contract (needs `vitest`). |

Then write the five pieces from "A host in a page". `apps/chat-bot-example-notes` is a complete second host with its own domain (a notes assistant), and a test that bundles it and fails if any Amelie code or database driver comes along.

These packages are workspace packages that ship TypeScript source, so they work as-is for another app in this repo and for any bundler (Workers, Vite). Using them from another repository means publishing them with a build step; nothing here does that yet.

## Layout

```
src/
  create-chat-bot.ts   the entry point
  contracts/           the wire protocol (also re-exported by @repo/contracts/chat-bots)
  services/            stream (claim the run, start the turn), resume, hydrate
  run/                 runChatBot, specialist handoff, turn collector, runner
  tools/               defineChatBotTool factory, server and MCP tools
  memory/              in-memory store
  drizzle/             Postgres store and tables (optional, needs drizzle-orm)
  hono/                optional routes
  testing/             the store contract
```
