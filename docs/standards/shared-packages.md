# Shared packages

**Covers:** `packages/*` libraries that hold runtime code apps import, for example `@repo/agent-runtime` (runs an AI turn and executes tools).

**Doesn't cover:** the contracts package (see Contracts) and database packages. Code inside a shared package that uses `effect` also follows the Effect scope.

**What it is:** a library shared by two or more apps. It is laid out like a Hono module (Hono JS §1): each feature folder is a module, with its constants, types and schemas in their own folders. The difference from contracts is that it holds code that runs, not only shapes. It can depend on third-party libraries (for example `@tanstack/ai`).

| # | Section |
|---|---|
| 1 | [Shared packages: Layout and entry points](#1-shared-packages-layout-and-entry-points) |
| 2 | [Shared packages: Constants, types and schemas](#2-shared-packages-constants-types-and-schemas) |
| 3 | [Shared packages: Runtime boundaries](#3-shared-packages-runtime-boundaries) |
| 4 | [Shared packages: Changing a package](#4-shared-packages-changing-a-package) |

---

## 1. Shared packages: Layout and entry points

**1.1 `[House]` One feature, one folder, laid out like a Hono module.** Each feature lives in `src/{feature}/` (kebab-case) and uses only the folders it needs:

```
packages/{package}/src/
├── index.ts               # export * from every feature
├── server.ts              # export * of server-only code, the ./server entry (1.3)
├── lib/                   # code and values two or more features share (2.4)
└── {feature}/             # e.g. chat/, tools/
    ├── index.ts           # barrel: export * from every file and folder below
    ├── constants/         # index.ts: every constant in the feature (2.1)
    ├── types/             # {feature}-types.ts: every hand-written type (2.2)
    ├── schemas/           # package-only Zod schemas + z.infer types (2.3)
    ├── {verb}-{thing}.ts  # the feature's code, e.g. run-export.ts
    └── __tests__/         # {file}.test.ts
```

- Folder rules are the same as Hono JS 1.1 and 1.6. Every folder except `__tests__/` has an `index.ts` barrel with `export *`. Folder names are plural. Every folder is optional, so don't create empty ones for symmetry.
- **The feature's code sits at the feature root,** one file per job (`run-export.ts`, `http-executor.ts`). It doesn't declare constants, hand-written types or schemas. Those go in the folders above.

**1.2 `[House]` One `exports` entry per feature.** `package.json` `exports` maps `./{feature}` to `./src/{feature}/index.ts`, and apps import only through those entries (as Contracts 2.3 does).

- Never add an entry for a single file (`./chat/output-schema`, `./structure`). It ties every app to the package's file layout, so moving one file breaks the apps.
- Never import a path that isn't an entry (`@repo/{package}/src/...`).

```jsonc
// package.json
"exports": {
  ".": "./src/index.ts",
  "./chat": "./src/chat/index.ts",
  "./tools": "./src/tools/index.ts",
  "./server": "./src/server.ts"      // 1.3
}
```

**1.3 `[House]` Server-only code has its own entry, and frontends never import it.** Feature barrels export only code that can run in a browser: parsers, pure helpers, and the types and schemas they use. Code that only runs on a server goes out through one `./server` entry (`src/server.ts`, a barrel of `export *` lines). That's code which calls an AI model, does HTTP to the backend, or reads bindings.

- The point is that a frontend import can't reach server code, even by accident. Without the split, `import { parseChatBotJson } from "@repo/chat-bot/chat"` also brings `runChatBot` into reach, and only tree-shaking keeps it out of the bundle.
- A frontend file that imports `@repo/{package}/server` is a bug.

```ts
// src/server.ts
export * from "./chat/run-chat-bot";
export * from "./tools/http-executor";
export * from "./tools/to-server-tool";
```

**1.4 `[House]` Package setup matches contracts.**

- **No build step** (Contracts 1.4). `exports` point at `.ts` source, and each app's bundler compiles it. Don't set `outDir` or `declaration` for a build that never runs.
- **Every import is a declared dependency.** Each package the code imports is in `package.json`: `zod`, `@tanstack/ai`, and `@repo/contracts` as `"workspace:*"`.
- **Apps depend on it as `"workspace:*"`,** so every app sees the current source.
- **The zod major version matches contracts** (Contracts 1.3), because the package's schemas mix with contract schemas.

---

## 2. Shared packages: Constants, types and schemas

**2.1 `[House]` Constants live in `{feature}/constants/index.ts`.** This follows Hono JS 1.7: group by topic with `// -----` sections, and name them `{PACKAGE}_{TOPIC}_{THING}` with a unit suffix (`CHAT_BOT_HTTP_DEFAULT_TIMEOUT_MS`). Split into `constants/{topic}.ts` past about 15 in a section.

Where a constant goes depends on who reads it:

| Read by | Goes in |
|---|---|
| One feature of the package | `{feature}/constants/` |
| Two or more features of the package | `src/lib/` (2.4) |
| The package and another workspace (the frontend reads it too) | the contracts package's `{family}/constants.ts` (Contracts 2.5) |

```ts
// tools/constants/index.ts
// -----
// HTTP executor
// -----
export const CHAT_BOT_HTTP_DEFAULT_TIMEOUT_MS = 5000;
export const CHAT_BOT_HTTP_MAX_RESPONSE_BYTES = 256 * 1024;

// -----
// Tool budget
// -----
export const CHAT_BOT_MAX_TOOL_CALLS_PER_TURN = 5;
```

**2.2 `[House]` Hand-written types live in `{feature}/types/`.** This follows Hono JS 1.8. Every `type` the feature declares by hand goes in `types/{feature}-types.ts`, re-exported by `types/index.ts`, grouped by topic. That covers inputs, function types and results, for example `ChatBotInput`, `ChatBotRouter`, `ChatBotToolSpec` and `ChatBotRuntime`.

- **Inferred types stay beside their schema** (`z.infer` in `schemas/`, or in contracts).
- **`type`, not `interface`.**
- A re-export of a library's type (`export type { StreamChunk }`) stays where it is.

**2.3 `[House]` Schemas go where their readers are.**

| Schema | Goes in | Example |
|---|---|---|
| Another workspace parses it too (a wire shape the frontend reads) | contracts (Contracts 1.1) | `ChatBotStructureSchema`, `ChatBotOutputSchema` |
| Only the package uses it | `{feature}/schemas/` | the `{ data, error }` envelope the HTTP executor unwraps |

- A package-only schema is named `{Package}{Thing}Schema`, with its `z.infer` type at the bottom of the same file (Contracts 3.8).
- Never copy a contract schema into the package. Import it, or build on it with `.extend()` / `.pick()` (Contracts 3.7).

**2.4 `[House]` Code and values shared by two or more features go in `src/lib/`.** This follows Hono JS 1.9: when a second feature needs something, move it in the same PR and import it from `src/lib/` in both. Features never import from each other's `constants/`, `types/` or `schemas/`.

**2.5 `[House]` Dependencies point one way: apps → shared package → contracts.**

```
apps (backend, frontend)
   │            │
   ▼            ▼
@repo/{package} ──▶ @repo/contracts ──▶ zod
```

- A shared package may import contracts. It imports a wire shape from there, exactly as an app does.
- Contracts never import a shared package (Contracts 1.2), so contracts stay zod-only.
- A shared package never imports an app.

---

## 3. Shared packages: Runtime boundaries

**3.1 `[House]` The app passes in all I/O.** A package never reads env vars, Worker bindings, the database or the session itself. The app resolves those and passes them in as arguments: an adapter, a `fetch` already bound to the Worker, a `userId`, rows already read from the database. This is the package version of Hono JS 2.3: services take plain values, not a `Context`.

- One package then works in every app that uses it. It also never needs a binding name or a database client type that only one app has.
- Tests pass a stub instead of mocking a module (React 8.1, Effect 5.2). If code calls a library function that does I/O (for example `chat()` from `@tanstack/ai`), take that function as an argument, so a test can hand in a fake without `vi.mock`.

```ts
// the backend resolves everything; the package only uses what it's given
runChatBot({
  adapter,                                  // the model adapter, built from the app's env
  prompts, tools,                           // rows the app already read from the database
  runtime: { userId, allowedPathPrefix, fetch: boundFetch },
  messages,
});
```

**3.2 `[House]` Expected failures are returned values; bugs are thrown.** A package can't import an app's `AppError` classes (2.5), so it reports failures in two ways:

| Failure | Example | Do this |
|---|---|---|
| Expected: the caller has a plan for it | a tool timed out, an endpoint returned 404, the input didn't parse | Return a typed value (`{ error: "timed out" }`, `{ answer: null }`). Declare its type in `types/`, plus a guard if callers need one (`isChatBotToolError`). |
| A bug or broken invariant | a value that must exist is missing | `throw new Error(message, { cause })`, keeping the original as `cause` (Effect 3.8) |

- The app maps both to its own errors at its boundary. The package never decides a status code or an envelope.
- Don't swallow an error with an empty `catch {}` unless the returned value says what happened. For example, `catch { return { error: "request failed" } }` is fine, and `catch { return null }` hides it.

**3.3 `[House]` React 8.1 and 8.2 type rules apply here too.** No `any`. No `unknown` in parameters, return types or type aliases, except at a boundary that parses it (use a named type such as `ChatBotJson` for "any JSON"). Every `as` has a `// SAFETY:` comment. No chained assertions.

---

## 4. Shared packages: Changing a package

**4.1 `[House]` A package change is a change to every app that imports it.** Before opening the PR:

1. Run the package's own `test` script.
2. Typecheck every app that imports the entry you changed. A change to `parseChatBotJson` affects both the backend and the frontend.

**4.2 `[House]` A change that crosses the wire follows Contracts 5.2.** If the change alters data that one app sends to another, deploy in the order Contracts 5.2 gives. An example is the shape of `structure` the backend saves and the frontend reads. That shape belongs in contracts anyway (2.3), so the PR changes contracts too.
