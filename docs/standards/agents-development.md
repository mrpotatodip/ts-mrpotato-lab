# Agents development

**Covers:** a chat-bot module's agent config, the tools its agents call and the router that picks an agent: `{module}/agents/`, `{module}/agent-tools/`, `{module}/agent-router/`, and the helper that turns a tool into something the model can call (`defineChatBotTool`).

**Doesn't cover:** the run loop beyond how it hands off to subagents (2.5), the stream log, and the thread and message routes. Those follow Hono JS and Effect. The shared contracts for cards and output follow Contracts.

**Packages:**
- `@tanstack/ai`: `toolDefinition` and `convertSchemaToJsonSchema` (§3).
- `zod`: tool input and result schemas (§3).
- `@tanstack/ai-typesafe`: the Jev decider behind `agent-router/` (§1.1).

| # | Section |
|---|---|
| 1 | [Agents development: Layout](#1-agents-development-layout) |
| 2 | [Agents development: Agents and prompts](#2-agents-development-agents-and-prompts) |
| 3 | [Agents development: Tools](#3-agents-development-tools) |
| 4 | [Agents development: Wrapping model-facing text](#4-agents-development-wrapping-model-facing-text) |
| 5 | [Agents development: Tests](#5-agents-development-tests) |

---

## 1. Agents development: Layout

**1.1 `[House]` One folder per agent, one folder per tool.** Agents, tools and the router are separate trees in the module:

```
{module}/
├── agents/
│   ├── index.ts              # export * from every agent folder
│   ├── shared/prompts.ts     # prompts two or more agents use (2.3)
│   ├── {agent}/              # e.g. main/, calculator1/
│   │   ├── agent.ts          # the agent's config (2.1)
│   │   ├── prompts.ts        # its own prompts (2.3)
│   │   └── index.ts
│   └── __tests__/
├── agent-tools/
│   ├── index.ts              # export * from public/ and admin/
│   ├── public/               # tools an anonymous user's agents may call
│   │   ├── index.ts          # export * from every tool folder
│   │   └── {tool}/           # kebab-case, e.g. get-opening-schedule/
│   │       ├── schema.ts     # input + result Zod schemas (3.2)
│   │       ├── function.ts   # the plain function the tool runs (3.3)
│   │       ├── definition.ts # defineChatBotTool + toolDefinition (3.1)
│   │       └── index.ts
│   ├── admin/                # tools for signed-in team members only, same {tool}/ shape
│   └── __tests__/
└── agent-router/
    ├── router.ts             # create{Module}JevRouter: subagentRoute + decide, Jev picks the children
    ├── index.ts
    └── __tests__/
```

- **The router lives in the module, not a package.** `agent-router/` builds TanStack's router from `subagentRoute` and `decide`, with Jev as the decider (`createTypesafeDecider`), so the app depends on `@tanstack/ai-typesafe` directly. It reads each agent's `name` and `description` (2.4), so it belongs beside `agents/`, not in `lib/`.
- **Every tool sits under `public/` or `admin/`.** A `public/` tool is safe for an anonymous user to trigger: read-only, scoped to the account the server fixed. Anything that changes an account's data, or that only a team member should see, goes in `admin/`, and only agents served on signed-in routes list it. An empty `admin/` stays out of the `agent-tools/index.ts` barrel until it has a tool.
- **Tools live outside `agents/`.** An agent lists the tools it uses (`tools: [addTwoNumbersTool]`). A tool doesn't belong to one agent, so moving it between agents or sharing it is a one-line change in `agent.ts`.
- **Files inside an agent, tool or router folder carry no prefix** (`agent.ts`, `prompts.ts`, `schema.ts`, `router.ts`). The folder already names what they belong to. This overrides the usual `{module}-{thing}` file naming. Exported symbols keep their full names (`chatBotCalculator1Agent`, `addTwoNumbersTool`), because other folders import them.
- Barrels and imports follow Hono JS 1.1 and 8.2: `export *` barrels, relative imports only inside one folder, and the `#/modules/{module}/...` alias to a barrel across folders.

**1.2 `[House]` A tool that grows becomes a small module.** The `schema.ts` / `function.ts` / `definition.ts` trio is for a tool with one function and no data access. Once a tool needs queries or more than one handler, its folder takes the module layers (Hono JS 1.1):

```
agent-tools/{public|admin}/{tool}/
├── api/        # {tool}-definition.ts: the defineChatBotTool export, the tool's boundary
├── handlers/   # {tool}-svc.ts: what run calls
├── queries/    # DB access
├── schemas/    # {tool}-schema.ts: input + result schemas
└── index.ts
```

- `definition.ts` maps to `api/`: it's the boundary the model calls, the way a route is the boundary an HTTP client calls. `function.ts` maps to `handlers/`.
- Switch the whole folder at once. Don't mix flat files with layer folders in one tool.

---

## 2. Agents development: Agents and prompts

**2.1 `[House]` Agent config is code, not database rows.** Each `agent.ts` exports one `ChatBotAgent`:

```ts
export const chatBotCalculator1Agent: ChatBotAgent = {
  id: CHAT_BOT_CALCULATOR1_AGENT_ID,
  name: "calculator1",
  description:
    "Adds two or three numbers. Hand it a request to add exactly two or " +
    "exactly three numbers; it replies with the sum. Not for four or more " +
    "numbers.",
  model: CHAT_BOT_DEFAULT_MODEL,
  temperature: null,
  prompts: [CHAT_BOT_CALCULATOR1_PERSONA_PROMPT, CHAT_BOT_GUARD_RAIL_PROMPT],
  tools: [addTwoNumbersTool, addThreeNumbersTool],
  subagents: [],
};
```

- Prompts, tools, model and subagents come from this object. Nothing reads them from the database. The route passes the top agent into the stream service (`agent: chatBotMainAgent`).
- `model` is typed as the adapter's model id, so a misspelled model fails at compile time.

**2.2 `[House]` Agent ids still match a database row.** Run and message rows have a foreign key to `chat_bot_agents`, so every agent's `id` must exist there.

- Ids are `{name}_{uuid}` (`calculator1_77ed3418-…`) and live in `constants/` (Hono JS 1.7).
- Adding an agent means a migration that seeds its row. Renaming one means a new id and a new row.

**2.3 `[House]` Prompts live in the agent's `prompts.ts`.** They're content, not settings, so they stay beside the agent that sends them, not in `constants/` (Hono JS 1.7, "Not constants").

- Name them `{MODULE}_{AGENT}_{KIND}_PROMPT` (`CHAT_BOT_MAIN_PERSONA_PROMPT`).
- A prompt two or more agents send goes in `agents/shared/prompts.ts` (`CHAT_BOT_GUARD_RAIL_PROMPT`).
- A prompt the run loop adds itself goes beside the run loop, not in `agents/`. For example, the format prompt that must match the output schema lives in `lib/chat-bot-run.ts`.
- An agent's `prompts` array is in send order: persona first, then the guard rail.
- **Every agent sends the guard rail.**

**2.4 `[House]` Subagents are routed by their description.** The router asks Jev one yes/no question per child, worded from its `description`, to pick which children run before main replies: none, one, or several (in parallel or in sequence, as Jev chooses).

- **A description says where the agent ends**, not only what it does ("Not for four or more numbers."). When two children's descriptions overlap, the router can't tell them apart.
- **No child is named after the router's fallback** (`CHAT_BOT_MAIN_ROUTE`, `"main"`). The router could never pick it, and `defineAgent` throws on it.

**2.5 `[TanStack docs]` Subagents run through `chat()`'s handoff.** The run loop makes one `chat()` call for the turn and lets TanStack run the children:

```ts
chat({
  adapter, messages, systemPrompts, tools,          // main
  subagents: {
    agents: children.map(toChatBotSubagent),        // defineAgent, run = the child's own chat()
    router,                                         // agent-router/ (2.4)
    strategy: "handoff",                            // children first, then main
  },
});
```

- **Agent config stays code (2.1); `defineAgent` happens per turn.** A child's `run` needs the turn's adapter, `userId` and tool budget, so `toChatBotSubagent` in `lib/` wraps each config with `defineAgent` when the turn starts. The child's `chat()` gets the run ids from its context (`threadId`, `runId`, `parentRunId`, `subagentRunId`, `resume`).
- **Main has no `outputSchema`.** `chat()` refuses `subagents` together with `outputSchema`. Main answers in plain text, and the saved answer is main's text: the `TEXT_MESSAGE_CONTENT` chunks without a `subagentRunId`. A child's chunks carry its `subagentRunId`.
- **A child's reply reaches main as an assistant message** after the user's latest message. The contract prompt tells main to build on it.
- **A failed child ends the turn** with `RUN_ERROR`; main doesn't run.
- **No router, no subagents.** Without a router (no `TYPESAFE_API_KEY`), the run loop leaves `subagents` off, so main answers alone instead of falling into TanStack's tool mode.

---

## 3. Agents development: Tools

**3.1 `[House]` Define a tool with `defineChatBotTool` and TanStack's `toolDefinition`.**

```ts
export const addTwoNumbersTool = defineChatBotTool({
  definition: toolDefinition({
    name: "addTwoNumbers",
    description:
      "Add exactly two numbers. Pass a and b. Returns a, b, and their sum. " +
      "Use this whenever the user asks to add two numbers; do not add them " +
      "yourself.",
    inputSchema: AddTwoNumbersInputSchema,
    outputSchema: AddTwoNumbersResultSchema,
  }),
  run: addTwoNumbers,
});
```

- `run`'s input and return types come from the two schemas, so a function that doesn't fit the schemas fails at compile time.
- `display`, `displayOptions` and `timeoutMs` are optional. They default to no card display and `CHAT_BOT_TOOL_DEFAULT_TIMEOUT_MS`.
- Tool names are unique across every agent. The turn collector keys saved cards by name.

**3.2 `[House]` Input schemas are strict; result schemas are not.**

- Input: `z.strictObject(...)`. The model sees `additionalProperties: false`, and an extra field fails validation instead of being dropped silently.
- Result: `z.object(...)`, so a function that returns an extra field still passes.
- Build both from one fields object (`{ ...addTwoNumbersFields, sum: z.number() }`). Don't reach into `.shape`.

**3.3 `[House]` The function is plain and gets `userId` from the session.** `function.ts` exports `(input, runtime) => result`, with no `@tanstack/ai` imports, so it can be tested without a model. The `ChatBotRuntime` type and chat-bot helpers that need no model (for example the editor role check) are allowed.

- `runtime.userId` comes from the signed-in session. Never put `userId` in a tool's input schema, because the model controls the input.
- The function runs in-process. Don't call the app's own HTTP routes from a tool.

**3.4 `[House]` Every expected failure reaches the model as `{ error }`.** `defineChatBotTool` validates the input, runs the function under a timeout, and validates the result. The model then gets data or `{ error: string }`, and the frontend renders `{ error }` as an error card.

| Failure | The model sees |
|---|---|
| Input fails the schema | `{ error: "invalid input" }`, and the function never runs |
| Function throws an `AppError` with a 4xx status | `{ error: <its message> }` |
| Function throws anything else | `{ error: "tool failed" }`, and the cause is logged |
| Timeout | `{ error: "timed out" }` |
| Result fails the schema | `{ error: "unexpected response" }` |
| Turn already used its tool calls | `{ error: "tool call limit reached for this turn" }` |

- **TanStack gets JSON Schema, not the Zod schema** (`convertSchemaToJsonSchema`). Given Zod, TanStack validates first and answers with plain text instead of `{ error }`.
- Throw a 4xx `AppError` only with a message that's safe for the model to repeat to the user.

---

## 4. Agents development: Wrapping model-facing text

**4.1 `[House]` Wrap prompts and descriptions at 80 columns without changing the text.** The model reads them, so the wrapping must not add line breaks or spaces.

- **Prompts** (top-level template literals): end each wrapped line with `\`. JavaScript drops the backslash and the line break, so the model gets one line. Open with `` `\ `` so the text starts on its own line with no leading newline. Keep the space before each `\`: it's the space between the two words.

  ```ts
  export const CHAT_BOT_CALCULATOR1_PERSONA_PROMPT = `\
  You are calculator1 for this app. Another agent hands you requests to add two or \
  three numbers.

  Always use a tool to add. Never add the numbers yourself.`;
  ```

- **Descriptions** (indented inside an object): split into `"…" +` pieces. A `\` continuation line must start at column 0, so inside an object its indentation would end up in the text. Every piece but the last ends with a space.
- Blank lines and list items are real line breaks. Don't wrap them away.

---

## 5. Agents development: Tests

**5.1 `[House]` Test the agent config.** One test file walks every agent and checks:

- Each id matches `{name}_{uuid}` with its own name.
- Every agent sends the guard rail.
- No child uses the router's fallback name.
- Tool names are unique.

**5.2 `[House]` Test each tool twice: the function, and the definition.**

- **Function:** call it directly with typed input, and check the schema's limits (missing fields, extra fields, list sizes).
- **Definition:** call `tool.execute(input, { userId })` the way a turn does, so the test also covers validation and the `{ error }` mapping (3.4).

**5.3 `[House]` Tests of the run loop and the stream service use a small test agent, not the real config.** A prompt edit then never breaks those tests. Only the tests in 5.1 and 5.2 read the real agents and tools.
