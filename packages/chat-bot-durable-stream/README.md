# @repo/chat-bot-durable-stream

A Postgres-backed `StreamDurability` adapter for TanStack AI's resumable streams. It works like `durableStream` from `@tanstack/ai-durable-stream`, but stores chunks in your own Postgres instead of a Durable Streams server.

A client that drops mid-reply reconnects with `Last-Event-ID` and gets the rest of the reply from the log, without the model running again.

## Setup

1. Add `"@repo/chat-bot-durable-stream": "workspace:*"` to the app, and to the app's DB package.
2. In the DB package, re-export the tables so drizzle-kit migrates them:
   ```ts
   // src/schema/chat-bot-durable-stream.ts
   export {
     chatBotDurableStreamChunks,
     chatBotDurableStreams,
   } from "@repo/chat-bot-durable-stream/tables";
   ```
   Then run `drizzle-kit generate` and `drizzle-kit migrate`. Import from `/tables`, not the root entry: drizzle-kit loads schema files with `require`, and the other entries pull in ESM-only `@tanstack/ai`.

   No drizzle-kit? Run [`sql/chat-bot-durable-stream.sql`](sql/chat-bot-durable-stream.sql) against the database instead. It's safe to run twice, and a test fails if it drifts from the Drizzle tables.
3. Pick a `streamPrefix` for the app (for example `"my-agent"`). Apps sharing a database keep their runs apart by prefix.

## Two ways to use it

### One call: when a route only needs the adapter

```ts
import { resumeServerSentEventsResponse } from "@tanstack/ai";
import { pgChatBotDurableStream } from "@repo/chat-bot-durable-stream/server";

// GET /chat?runId=...&offset=...  (reconnect / join)
const adapter = pgChatBotDurableStream(request, { db, streamPrefix: "my-agent" });
return resumeServerSentEventsResponse({ adapter });
```

The run comes from the `X-Run-Id` header or `?runId`, and the resume point from `Last-Event-ID` or `?offset`. If the server creates the run id itself, pass it instead of the request:

```ts
pgChatBotDurableStream({ runId }, { db, streamPrefix: "my-agent" });
```

#### Example: `elise-engine-api`'s chat-bot

The chat-bot uses the one-call form behind a small factory, so handlers get one function and tests can swap the database for memory. See `apps/elise-engine-api/src/modules/api-frontend/chat-bot/lib/chat-bot-durable-stream.ts`:

```ts
export const chatBotDurableStreamOptions = { streamPrefix: "chat-bot", retainMs, onPruneError };

export function chatBotDurableStreams(db) {
  return (init) => pgChatBotDurableStream(init, { db, ...chatBotDurableStreamOptions });
}

// handlers
durableStream({ runId });             // producer, in waitUntil
durableStream({ runId, offset });     // SSE reader
durableStream({ runId }).close();     // setup failed before streaming

// tests
const store = memoryChatBotDurableStreamStore();
const durableStream = (init) =>
  createChatBotDurableStream(store, { ...init, ...chatBotDurableStreamOptions });
```

Handlers pass the run id they already checked, never the raw request, so a request can't pick a run its user doesn't own.

### Store + adapter: when you need the store too

Use this when you want to call the store directly (for example `store.prune()` with `retainMs: null`), or to build a test stream over `memoryChatBotDurableStreamStore()`.

```ts
import { createChatBotDurableStream } from "@repo/chat-bot-durable-stream";
import { pgChatBotDurableStreamStore } from "@repo/chat-bot-durable-stream/server";

const store = pgChatBotDurableStreamStore(db);        // tests: memoryChatBotDurableStreamStore()
const adapter = createChatBotDurableStream(store, { runId, offset, streamPrefix: "my-agent" });
```

## Producing a run in the background

On Workers, run the model in `waitUntil` so it keeps going after the client leaves. Then answer the request by reading back from the log:

```ts
import { produceChatBotDurableRun } from "@repo/chat-bot-durable-stream";

const writer = createChatBotDurableStream(store, { runId, streamPrefix: "my-agent" });
ctx.waitUntil(
  produceChatBotDurableRun(writer, chat({ ... }), { runId, errorMessage: "Run failed" }),
);

const reader = createChatBotDurableStream(store, { runId, offset: "-1", streamPrefix: "my-agent" });
return resumeServerSentEventsResponse({ adapter: reader });
```

The writer has no offset, so it's the producer. The reader starts at `"-1"` (the beginning) so the first client and a reconnecting client take the same path.

The producer batches text deltas (32 chunks or 100ms), writes other events straight away, and closes the stream when the run ends. If the run fails, it writes a `RUN_ERROR` with your fixed message, closes the stream and rethrows the real error.

## Cleanup

Closing a stream also deletes this prefix's streams that closed more than `retainMs` ago (default 10 minutes). Only producers close streams, so readers never trigger it. A failed sweep doesn't fail the close: it goes to `onPruneError`, and the next close tries again.

```ts
createChatBotDurableStream(store, {
  runId,
  streamPrefix: "my-agent",
  retainMs: 30 * 60 * 1000, // or null to keep everything and call store.prune() yourself
  onPruneError: (error) => console.error("prune failed", error),
});
```

The same options work on `pgChatBotDurableStream(source, { db, streamPrefix, retainMs, onPruneError })`.

## Runs that die without finishing

If `waitUntil` is cut off (a crash or a deploy), the stream stays open. A reader ends an open stream once its newest chunk is older than `staleMs` (default 2 minutes), with a `RUN_ERROR` under the model's run id, so the client settles the reply instead of waiting. Pass `staleMs: null` to wait forever instead. A tool call that runs quietly for longer than `staleMs` looks the same as a dead run, so raise it if your tools are slow.

## Things you own

- **The run's own status.** The stream ending doesn't mark your run row as finished; if your app tracks runs, clean up ones whose stream went stale.
- **Resend side effects.** On a dropped connection the client resends the same POST. Check `adapter.resumeFrom()` (or look the run up) before doing one-time work such as saving the user's message.

## Limits

Readers poll Postgres every `pollMs` (default 50ms, two queries per poll, sent in parallel). That's fine at low traffic. Under heavy concurrent streaming, raise `pollMs` or move to `@tanstack/ai-durable-stream`, where readers wait on a Durable Object instead of polling.
