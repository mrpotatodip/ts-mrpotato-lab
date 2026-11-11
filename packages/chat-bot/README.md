# @repo/chat-bot

The model-facing half of the chat bot: run one chat turn against a model, turn tool specs into server tools, and parse the model's structured output. Built on `@tanstack/ai` and Effect.

This package does not store threads or stream to a browser. `@repo/chat-bot-api` is the engine for that. No app or package imports `@repo/chat-bot` yet. The chat-bot packages came from Amelie and are kept for future chat in EliseLAB, see `docs/adr/0001-keep-chat-bot-packages.md`.

## Entry points

| Import | Holds |
| --- | --- |
| `@repo/chat-bot` | Everything below in one import. |
| `@repo/chat-bot/chat` | `run-chat-bot.ts` (runs a turn and fails with `ChatBotModelError`), the contract prompt, and `parse-output.ts`. |
| `@repo/chat-bot/tools` | Tool schemas, `http-executor.ts`, `to-server-tool.ts` (with a per-run call budget), display and structure helpers, tool errors. |
| `@repo/chat-bot/server` | The server-side entry. |

The shape of a turn's output (`ChatBotOutputSchema`, `ChatBotTurn`) lives in `@repo/contracts/chat-bots`, not here.

## Run the tests

```bash
pnpm --filter @repo/chat-bot test
```

`check` runs the same vitest suite. There is no type-check step in this package, so `tsc` errors surface in the apps that import it.
