# chat-bot

A chat bot you copy into your project: the server side (threads, streaming answers that survive a dropped connection, tool calls, a handoff from a main agent to specialists, an owner check so one user never sees another's chat) and a React chat UI that talks to it. It has no database and no product logic. You bring who the user is, where to store chats, and which model to call.

Folders, copied as-is:

```
chat-bot/
  README.md                       this file
  example/wiring.ts               START HERE for the server: a whole host in one file
  example/start-route.txt         the TanStack Start server route that mounts it (copy to src/routes/api/chat.$.ts)
  example/Assistant.tsx           the page: <ChatBotWithProgress /> with tool wording
  chat-bot-api/                   the engine        (its own README has the details)
  chat-bot-durable-stream/        the stream log    (lets a client resume an answer)
  chat-bot-react/                 the chat UI       (<ChatBot />; its README has the props)
  chat-bot-react-loader/          optional: step-by-step progress while the assistant works
```

Server only? Skip both React folders. No progress display? Skip `chat-bot-react-loader`. UI only, against someone else's server? You need `chat-bot-react` and the `contracts` folder inside `chat-bot-api/src`.

## Add it to your project

**1. Copy the folder** to `src/vendor/chat-bot` (anywhere works; change the paths in step 2 to match).

**2. Point the import names at it.** The code inside imports `@repo/chat-bot-api`, `@repo/chat-bot-durable-stream`, `@repo/chat-bot-react` and `@repo/chat-bot-react-loader`. Map them in `tsconfig.json` (keep the leading `./`; without `baseUrl` TypeScript rejects paths that lack it):

```json
{
  "compilerOptions": {
    "paths": {
      "@repo/chat-bot-api": ["./src/vendor/chat-bot/chat-bot-api/src/index.ts"],
      "@repo/chat-bot-api/*": ["./src/vendor/chat-bot/chat-bot-api/src/*"],
      "@repo/chat-bot-durable-stream": ["./src/vendor/chat-bot/chat-bot-durable-stream/src/index.ts"],
      "@repo/chat-bot-durable-stream/*": ["./src/vendor/chat-bot/chat-bot-durable-stream/src/*"],
      "@repo/chat-bot-react": ["./src/vendor/chat-bot/chat-bot-react/src/index.ts"],
      "@repo/chat-bot-react/*": ["./src/vendor/chat-bot/chat-bot-react/src/*"],
      "@repo/chat-bot-react-loader": ["./src/vendor/chat-bot/chat-bot-react-loader/src/index.ts"],
      "@repo/chat-bot-react-loader/*": ["./src/vendor/chat-bot/chat-bot-react-loader/src/*"]
    }
  }
}
```

Then make your bundler follow them. Vite and Vitest (so TanStack Start too): `resolve: { tsconfigPaths: true }` in `vite.config.ts`. Other bundlers: an alias with the same eight entries (six without the loader). Plain Node: this is TypeScript source, so run it through `tsx` or a build step. If you'd rather not have `@repo/` in your code, rename it in the paths and with a find-and-replace inside this folder.

**3. Install what it needs, at these versions.** The code imports these but does not bundle them, so your project and the engine share one copy.

```bash
pnpm add -E "@tanstack/ai@0.63.0" "@tanstack/ai-react@0.29.3" "@tanstack/ai-openai@0.25.1"
pnpm add "effect@^3.21.2" "zod@^4.4.3" "hono@^4.3.7" "hono-openapi@^1.3.3"
pnpm add motion clsx @ag-ui/core        # only for the progress display (chat-bot-react-loader)
```

Why the exact versions for TanStack AI (`-E`): these packages are 0.x, where any minor release can change types. A plain `pnpm add @tanstack/ai-react` installs the newest, which pulls a newer `@tanstack/ai` next to yours, and the two disagree (`tsc` fails with "Type 'AGUIEvent' is not assignable"). The three above install as one consistent set. `ai-openai` is the model adapter; use another TanStack AI adapter if you prefer, at a version that matches `@tanstack/ai`. Keep `effect` on 3.x too: version 4 is a breaking release the engine does not compile against, and a plain `pnpm add effect` installs it.

You also need `react` (a TanStack Start app has it). `hono` and `hono-openapi` are only for the ready-made routes in `chat-bot-api/src/hono`; skip them if you call the engine directly. Run `tsc --noEmit` after installing: Vite does not type-check, so a version mismatch would otherwise only show up when a request fails.

**4. Read `example/wiring.ts`**, then copy it into your app and fill in the five pieces. In a TanStack Start app, `example/start-route.txt` is the server route that uses it (copy it to `src/routes/api/chat.$.ts`), and `example/Assistant.tsx` is the page. It serves under `/chat` unless you pass `basePath`; set it to match your server route (`"/api/chat"` for a file route named `src/routes/api/chat.$.ts`).

| Piece | What you give the engine |
|---|---|
| Owner | `{ kind: "user", scopeId, userId }` from your own auth. `scopeId` is your unit of isolation (tenant, org, workspace). |
| Store | Where chats are kept. `createMemoryChatBotStore()` to start. |
| Model | `adapterFor(model)`: how a model name becomes an adapter, and where your API key goes. |
| Agents and tools | Plain data: model, prompts, tools, optional subagents. |
| Failures | The engine fails with tagged errors (`NotFound`, `Invalid`, `Conflict`, `DbError`); you choose the HTTP shape. |

Mount the result behind your auth, as a Hono app, or call `chat.stream(...)` yourself from any server route. In a TanStack Start app that is one splat server route under `/api/chat`, shown in `example/start-route.txt`. Start's `Request` cannot be copied with `new Request(request)`, so that file rebuilds it from its parts. The browser side is `useChat` from `@tanstack/ai-react` with `fetchServerSentEvents("/api/chat")`; the engine accepts what it posts.

## Set the system prompt

The system prompt is the `prompts` list on the agent. Nothing in the engine folders holds your prompt; you pass it in, from `example/wiring.ts` (or your copy of it).

**A fixed prompt.** Pass `prompts`: one string per block, sent in this order.

```ts
const app = createExampleApp({
  // ...adapterFor, model, ownerFrom, waitUntil
  prompts: [
    "You are the customer support assistant for Acme. Answer questions about Acme only. Be concise and friendly.",
    "Never invent order details, prices or policies. If you don't know, say so and offer to connect the customer with a person.",
  ],
});
```

**Your own tools, or a prompt per customer.** Pass `agent`, a function of the request. It returns the whole agent (model, prompts, tools, subagents), so you can read the customer from the request and build their prompt:

```ts
import { defineChatBotTool, exampleAgent } from "./vendor/chat-bot/example/wiring";

const app = createExampleApp({
  // ...
  agent: (request) => ({
    ...exampleAgent("gpt-4o-mini", [personaFor(companyOf(request)), GUARD_RAILS]),
    tools: [lookupOrderTool, createTicketTool], // made with defineChatBotTool
  }),
});
```

**What the model actually gets:** your `prompts`, in order, then the engine's own tool rules (`chat-bot-api/src/run/contract-prompt.ts`: call a tool when it can answer, never guess a tool's result, say so when a tool errors, reply in plain text). That last block is always appended to the main agent, so you don't repeat those rules. If a subagent ran first, its result is added as one more prompt for that turn.

**For a customer-service bot:** put the persona and scope in one string and the hard rules (never invent facts, when to hand off to a person, what not to promise) in another. Keep facts out of the prompt and behind tools, so answers come from your systems and not from the model's memory. `chat-bot-api/src/types.ts` has the full agent shape.

## The React part

Once the server route exists (say at `/api/chat`), the page is:

```tsx
import { ChatBot } from "@repo/chat-bot-react";
import "@repo/chat-bot-react/chat-bot.css";

export function Assistant() {
  return (
    <div style={{ height: 560 }}>
      <ChatBot endpoint="/api/chat" />
    </div>
  );
}
```

You get streamed answers, a list of past chats (open, rename, delete, new chat), and tool results as folded cards. Give your own card per tool with the `tools` prop, restyle with the `--cb-*` CSS variables, or build your own screen from `ChatBotRoom`, `MessageList`, `Composer` and the hooks. See `chat-bot-react/README.md`. Replies show as plain text (no markdown).

## The progress display (optional)

`chat-bot-react-loader` shows what the assistant is doing while you wait, one row per step, each a spinner that becomes a tick:

```
✓ Got your message
✓ Found your order
⟳ Writing a reply
```

Swap `ChatBot` for `ChatBotWithProgress` and say what your tools are called in plain words (tool names are code names, so a row never shows them):

```tsx
import { ChatBotWithProgress } from "@repo/chat-bot-react-loader";
import "@repo/chat-bot-react/chat-bot.css";
import "@repo/chat-bot-react-loader/loader.css";

const LABELS = {                       // define it outside the component
  tools: { lookupOrder: { busy: "Looking up your order", done: "Found your order" } },
};

<ChatBotWithProgress endpoint="/api/chat" labels={LABELS} />
```

No Tailwind needed; the styles are in `loader.css` and follow the chat's `--cb-*` colours. See `chat-bot-react-loader/README.md` for the other labels and the pieces (`useChatBotProgress`, `ChatBotProgress`) if you want the rows somewhere else.

## What is not in this copy

Left out because they need `drizzle-orm` or `vitest`:

- **A Postgres store** (`createDrizzleChatBotStore`, in `chat-bot-api/src/drizzle`) and its tables and SQL.
- **The store contract** (`chat-bot-api/src/testing`), a test suite you run against any store you write.
- **The Postgres stream log** (`chat-bot-durable-stream`'s `server.ts`, `tables/`, `pg-*`).
- All tests.

Without them, chats and the stream log live in memory: they reset when the server restarts, and each server instance has its own. That is fine for trying it out. For production, get those parts from the source repo, copy them in, and add `drizzle-orm`; or implement `ChatBotStore` (see `chat-bot-api/src/types.ts`) over your own database and run the store contract on it.

## Things to know

- **`waitUntil`.** The engine finishes the model's answer in the background after the response closes. On a Node server `(job) => void job.catch(console.error)` is enough. On Cloudflare Workers pass the platform's `waitUntil`, or the run can be cut off.
- **Copies drift.** This is a snapshot. Fixes made in the source repo will not reach it unless you copy again.
- **Tested.** The whole bundle (server folders, React UI, progress display, and the files in `example/`) was pasted into a brand-new TanStack Start app outside the source repo, following the steps above, with exact TanStack versions as listed and the latest Vite 8, React 19 and TypeScript 7. It type-checks and builds. In headless Chromium, against that app with a fake OpenAI server behind it, it streamed an answer, ran a tool call with its progress rows (using the labels from `Assistant.tsx`) and its card, listed the thread, restored it after a reload, showed another user no threads, and returned 401 without a cookie; no console errors. Not tested: a real OpenAI key, Cloudflare, or Node versions other than the one used here.
