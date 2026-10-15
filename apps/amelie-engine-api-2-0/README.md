# amelie-engine-api-2-0

The chat bot alone, wired onto [`@repo/chat-bot-api`](../../packages/chat-bot-api/README.md). It exists to show how the engine plugs into a host. No cafe, menu or tenant code is here; those are in `amelie-engine-api`.

## Read in this order

| File | What it shows |
|---|---|
| [src/chat-bot.ts](src/chat-bot.ts) | **The wiring.** The five things the engine needs: a store, a stream log, a model, an owner, and the routes. |
| [src/agent.ts](src/agent.ts) | An agent is data: model, prompts, tools. Tools get the host's `Services` plus `owner` and `threadId`. |
| [src/http.ts](src/http.ts) | The host's run point: the engine's tagged failures become HTTP errors. |
| [src/index.ts](src/index.ts) | A plain Hono app with an error envelope, and the routes mounted at `/chat-bot`. |
| [src/__tests__/chat-bot.test.ts](src/__tests__/chat-bot.test.ts) | The whole thing over HTTP with a fake model. |

## Run it

```bash
cp .dev.vars.example .dev.vars          # add OPENAI_API_KEY
pnpm --filter amelie-engine-api-2-0 dev # http://localhost:8789

curl -N -X POST localhost:8789/chat-bot \
  -H 'x-user-id: ada' -H 'content-type: application/json' \
  -d '{"content":"What time is it, and who am I?"}'
curl localhost:8789/chat-bot/threads -H 'x-user-id: ada'
```

Auth is two headers (`x-user-id`, optional `x-scope-id`); replace `ownerFrom` in `chat-bot.ts` with your own.

## Swapping a piece

- **Database:** on Postgres, use `createDrizzleChatBotStore` from `@repo/chat-bot-api/drizzle` (see its README). Otherwise write a `ChatBotStore` and run `describeChatBotStoreContract` from `@repo/chat-bot-api/testing` on it.
- **Stream log:** the memory one lasts as long as the isolate. Use `pgChatBotDurableStream` from `@repo/chat-bot-durable-stream/server` for a real one.
- **Agents and tools:** edit `agent.ts`. Nothing else changes.
