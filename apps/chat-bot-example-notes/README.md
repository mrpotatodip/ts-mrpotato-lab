# chat-bot-example-notes

A notes assistant built on `@repo/chat-bot-api` by a host that has nothing to do with Amelie. It shows what a third-party project writes.

## Setup

```bash
cd apps/chat-bot-example-notes
cp .dev.vars.example .dev.vars        # then put your OPENAI_API_KEY in it
pnpm dev                              # http://localhost:8790

# a message (streams the answer); x-run-id is any unique string
curl -N -X POST localhost:8790/chat \
  -H 'x-workspace: acme' -H 'x-member: ada' \
  -H 'x-run-id: run-1' -H 'content-type: application/json' \
  -d '{"content":"Remember to buy milk, then list my notes"}'

curl localhost:8790/chat/threads -H 'x-workspace: acme' -H 'x-member: ada'
```

`.dev.vars` is the Worker's local secrets file (gitignored); there is no `.env` here. In production set the key with `wrangler secret put OPENAI_API_KEY` and the model as a variable. Threads and notes live in memory, so they reset when the dev server restarts.

## Set your model and API key

Two settings, both yours:

| Setting | Where | Default |
|---|---|---|
| API key | `OPENAI_API_KEY` in the Worker's environment (a secret) | none, required |
| Model | `NOTES_MODEL` in the environment, or `model` in `createNotesApp({ runner, model })` | `gpt-4o-mini` |

```ts
// src/worker.ts reads both from env
createNotesApp({ runner: openaiRunner(env.OPENAI_API_KEY), model: env.NOTES_MODEL ?? "gpt-4o-mini" });
```

How it fits:
- The **agent** names a model (`createNotesAgent(model)`). A subagent could name a different one.
- The **runner** (`src/model.ts`) turns that name into an adapter with your key. This is the only place the key is used.
- To use another provider, return its TanStack AI adapter from `adapterFor` instead. Only the OpenAI adapter is installed in this repo.

## Files

| File | |
|---|---|
| `src/index.ts` | The host: auth from headers, the engine, the routes, the error mapping. |
| `src/notes.ts` | This host's domain: its services, tools and agent. |
| `src/model.ts` | Model and key. |
| `src/worker.ts` | A Worker entry that reads them from the environment. |
| `src/__tests__/portable.test.ts` | Bundles the app and fails if Amelie code or a database driver comes along. |
