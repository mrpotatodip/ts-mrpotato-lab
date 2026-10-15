# @repo/chat-bot-react

A React chat UI for `@repo/chat-bot-api`. Point it at your server route and you have a working chat: streamed answers, past conversations, rename and delete, and tool results.

```tsx
import { ChatBot } from "@repo/chat-bot-react";
import "@repo/chat-bot-react/chat-bot.css";

export function Assistant() {
  return (
    <div style={{ height: 600 }}>
      <ChatBot endpoint="/api/chat" />
    </div>
  );
}
```

It talks to the routes the engine serves: `POST {endpoint}` to send a message, `GET {endpoint}?threadId=` to load a thread, and `{endpoint}/threads` to list, rename and delete. It needs `react`, `@tanstack/ai-react` and `zod`.

## Props (`<ChatBot />`)

| Prop | |
|---|---|
| `endpoint` | Your route. Default `"/api/chat"`. |
| `headers` | Extra request headers, or a function returning them (called on every request, for a fresh token). |
| `credentials` | `fetch` credentials, e.g. `"include"`. |
| `fetch` | Your own `fetch`. |
| `threads` | `false` hides the list of past chats. |
| `tools` | Tool cards, by tool name (below). |
| `placeholder`, `emptyText`, `className` | Text and styling hooks. |
| `room` | Swap the conversation view for your own component (it receives the room's props). `ChatBotRoomWithProgress` from `chat-bot-react-loader` is one. |
| `onChunk` | Called with every event of the answer stream as it arrives. |
| `onTurnStart` | Called when a message is sent, before anything streams. |
| `progress` (on `ChatBotRoom`) | A node shown under the messages in place of the three typing dots. |

## Tool results

When the assistant calls a tool, its result shows as a folded JSON card. Give your own component by tool name:

```tsx
<ChatBot
  tools={{
    currentTime: ({ results }) => <p>It is {String((results[0] as { iso: string }).iso)}</p>,
  }}
/>
```

A renderer gets `{ name, input, results }`. Live replies and reloaded threads both work, with one difference: a reloaded thread has the saved results but not the model's `input`.

## Style

Import `chat-bot.css` once. Everything uses `cb-` classes and `--cb-*` variables (`--cb-bg`, `--cb-fg`, `--cb-accent`, `--cb-radius`, ...); override them on `.cb-root` or a parent. Dark mode follows `prefers-color-scheme`.

## Progress while it works

By default a reply shows three typing dots until it starts. For a step-by-step display ("Looking up your order", then "Reply written"), use `@repo/chat-bot-react-loader`: `<ChatBotWithProgress />` instead of `<ChatBot />`. It is built on `onChunk`, `onTurnStart`, `progress` and `room`, which you can use for your own display too.

## Build your own

The pieces are exported: `ChatBotRoom` (one conversation), `MessageList`, `Composer`, `ThreadList`, and the hooks `useChatBot` and `useChatBotThreads`. To switch conversations, give `ChatBotRoom` a new `key`, which is what `<ChatBot />` does.

## Not here

Markdown rendering (replies show as plain text), the engine's structured card types (`number`, `table`, `list`, `key_value`: use `tools` renderers), file attachments, and message editing.
