# @repo/chat-bot-react-loader

A step-by-step progress display for [`@repo/chat-bot-react`](../chat-bot-react/README.md). While the assistant works it shows one row per step of the turn, each with a spinner that becomes a tick and friendly rotating text:

```
✓ Got your message
✓ Found your order
⟳ Writing a reply
```

It is the AG-UI loader from the Amelie dashboard chat, ported to plain CSS (no Tailwind) and wired to `chat-bot-react`.

## Use it

```tsx
import { ChatBotWithProgress } from "@repo/chat-bot-react-loader";
import "@repo/chat-bot-react/chat-bot.css";
import "@repo/chat-bot-react-loader/loader.css";

<ChatBotWithProgress
  endpoint="/api/chat"
  labels={{
    tools: { lookupOrder: { busy: "Looking up your order", done: "Found your order" } },
  }}
/>
```

`ChatBotWithProgress` takes everything `ChatBot` does, plus `labels` and `maxVisible` (rows shown at once; older ones fold into "earlier steps", default 6).

## The words

Tool and specialist names are code names, so a row never shows them: it shows what you wrote in `labels`, or a generic line.

| `labels` key | Row for | Default |
|---|---|---|
| `run` | the turn starting | "Thinking" / "Getting started", then "Got your message" |
| `reply` | the model writing text | "Writing a reply" / "Almost ready", then "Reply written" |
| `tools` | a tool call, by tool name `{ busy, done }` | the `fallback` |
| `subagents` | a specialist, by name `{ busy, done }` | the `fallback` |
| `fallback` | any tool or specialist not listed | "Working on it" / "Finished a step" |

Busy texts that are lists rotate while the step runs.

## Pieces

- `ChatBotRoomWithProgress`: a room with the display; pass it to `<ChatBot room={...} />` yourself.
- `useChatBotProgress()`: `{ state, onChunk, onTurnStart }`. Give `onChunk` and `onTurnStart` to `ChatBotRoom` and draw `state` with `<ChatBotProgress state labels />`, if you want the rows somewhere else.
- The loader itself (`agui-loading/`, also exported): a state machine and React components, usable with any AG-UI event stream.

## Needs

`react`, `@tanstack/ai` (types) and `@tanstack/ai-react` (through `chat-bot-react`), plus `motion`, `clsx` and `@ag-ui/core`. No Tailwind: styles are in `loader.css`, and colours follow the chat's `--cb-*` variables.

## Not here

- Amelie's cafe-flavoured wording ("Perking up", "Pouring out an answer"). The defaults here are neutral; put your own in `labels`.
- Amelie's split between "tool prose" and "the answer". That relied on a custom event our engine does not send, so every text message reads as "Writing a reply".
