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

`ChatBotWithProgress` takes everything `ChatBot` does, plus `labels`, `maxVisible` (rows shown at once; older ones fold into "earlier steps", default 6), `tree` (draw tree lines so a specialist's rows hang under its own row, including nested specialists; default off) and `sounds`.

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

## Sounds

Off by default. `sounds` plays a sound as each level starts (`start`) and as it finishes (`end`):

```tsx
<ChatBotWithProgress sounds />                       {/* ripple at each start, petal at each finish (not run or turn) */}
<ChatBotWithProgress sounds={{ end: true }} />       {/* finish sounds only */}
```

```tsx
import { petalSound, rippleSound } from "@repo/chat-bot-react-loader/sounds";

<ChatBotWithProgress
  sounds={{
    start: { turn: rippleSound, tools: { lookupOrder: rippleSound } },
    end: { reply: petalSound, tools: petalSound, turn: petalSound },
  }}
/>
```

`start` and `end` each take `true` or a pick of levels. `true` covers every level except `run` and `turn`, which always start or end together with another level and would only double up; name them yourself if you want them. Level keys match `labels`: `run`, `reply`, `tools`, `subagents`, plus `reasoning` and `turn` (the whole turn). `tools` and `subagents` take one sound for all, or a map by name; a name not in the map is silent. A level or side you leave out is silent. A value is a sound recipe, or `{ recipe, tune }`.

The sounds are [React Bits](https://reactbits.dev) recipes (SoundPetal, SoundRipple) vendored in `src/sounds/`, and live behind the `/sounds` entry, which also exports `setSoundMuted` and `setSoundVolume` for a mute switch. The main entry has no sound assets. The audio code is loaded the first time a sound plays, so an app that sets no sounds never downloads it.

## Pieces

- `ChatBotRoomWithProgress`: a room with the display; pass it to `<ChatBot room={...} />` yourself.
- `useChatBotProgress()`: `{ state, onChunk, onTurnStart }`. Give `onChunk` and `onTurnStart` to `ChatBotRoom` and draw `state` with `<ChatBotProgress state labels />`, if you want the rows somewhere else.
- The loader itself (`agui-loading/`, also exported): a state machine and React components, usable with any AG-UI event stream.

## Try it

```bash
pnpm --filter @repo/chat-bot-react-loader demo   # http://localhost:5175, or the next free port
```

Plays scripted AG-UI streams (plain reply, one tool, many tools, subagent, multi agent with a nested subagent, error) through `useChatBotProgress` and `<ChatBotProgress />`, with toggles for custom labels, tree lines, sounds and `maxVisible`. No API needed.

## Needs

`react`, `@tanstack/ai` (types) and `@tanstack/ai-react` (through `chat-bot-react`), plus `motion`, `clsx` and `@ag-ui/core`. No Tailwind: styles are in `loader.css`, and colours follow the chat's `--cb-*` variables.

## Not here

- Amelie's cafe-flavoured wording ("Perking up", "Pouring out an answer"). The defaults here are neutral; put your own in `labels`.
- Amelie's split between "tool prose" and "the answer". That relied on a custom event our engine does not send, so every text message reads as "Writing a reply".
