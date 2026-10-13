# Coding Standards

Reviewers read this file when checking a change. It is not loaded while code is being written.

## Scopes

| Scope | Applies to |
|---|---|
| [General](#general) | All code in every app and package, whether a person or an agent wrote it |
| [Hono JS](#hono-js) | Route code in every Hono backend app |
| [React](#react) | React frontend apps built on TanStack Start, Router, Query and Form |
| [Contracts](#contracts) | The shared contracts package: Zod schemas shared across apps |
| [Shared packages](#shared-packages) | `packages/*` libraries with runtime code that apps import (not contracts, not database packages) |
| [Effect](#effect) | Code written with the `effect` library: effects, typed errors, and the boundary where they run |
| [Agents development](#agents-development) | A backend's chat-bot agents and the tools they call: `{module}/agents/` and `{module}/agent-tools/` |

Each scope is a top-level `#` heading, and every section heading inside it starts with the scope name ("Hono JS:", "React:"). Add a new scope (for example Drizzle) as its own `#` heading and a row in this table. Don't mix its rules into another scope.

Pick one well-built module per scope as the reference implementation, and point reviewers at it in the repo's `CLAUDE.md` or README.

## Rule tags

Every rule starts with a tag saying where it comes from:

- **`[Hono docs]`**, **`[React docs]`**, **`[TanStack docs]`**, **`[Effect docs]`**: taken from that library's official documentation, with a link to the page.
- **`[House]`**: a convention of this codebase, not something the library prescribes.

---

# General

**Covers:** every source file in the monorepo, in any app or package, written by a person or an agent.

**Doesn't cover:** Markdown docs, and the text inside prompts and tool descriptions (Agents development §4).

| # | Section |
|---|---|
| 1 | [General: Comments](#1-general-comments) |

---

## 1. General: Comments

**1.1 `[House]` Write no comments.** Names, types and small functions say what the code does. Don't add a comment that repeats the code, narrates a step (`// fetch the user`), labels a block, or records a change (`// added for #346`, `// removed old check`). Such comments go stale, and an agent adding them only makes a diff look explained. This rule binds agents as much as people.

**1.2 `[House]` Only these comments are allowed.** Anything not on this list is a violation:

- **`// SAFETY:`** right above an `as` assertion (React 8.1).
- **`// -----` section dividers** in `constants/` and `types/` files (Hono JS 1.7, 1.8, Contracts 2.5).
- **A comment another rule asks for:**
  - Why a response is bare, not in the envelope (Hono JS 4.1).
  - Why a route is on the public allowlist (Hono JS 6.2).
  - Why a route uses the realtime connection (Hono JS 7.2).
  - Why a read uses `POST` (Hono JS 8.1).
  - The reason for a `useMemo`, `useCallback` or `memo` that isn't obvious (React 6.4).
- **A directive a tool reads** (`// @ts-expect-error`, a lint directive), and only where no rule above forbids the suppression (React 6.3).

**1.3 `[House]` Leave other people's comments alone.** Don't delete or reword a comment you didn't write. The exception is code you're changing anyway: update or remove its comment in the same edit, so it never describes code that is gone.

**1.4 `[House]` An allowed explanatory comment uses the wrapped form.** That means the 1.2 "another rule asks for" comments: a `// -----` line, the text in short `//` lines, a closing `// -----`. No `/** */` JSDoc blocks. `// SAFETY:` stays one line.

```ts
// -----
// Public: Stripe calls this
// without a session.
// -----
```

**1.5 `[House]` Reviewers check the diff for comments.** Flag every added comment that 1.2 doesn't list, and ask for its removal.

---

# Hono JS

**Covers:** files under `{module}/api/`, each module's `index.ts`, and the app `index.ts` where middleware, `onError` and mounts live.

**Doesn't cover:** services (`handlers/`), queries (`queries/`) and domain logic behind the routes. For those, see each app's own docs.

**Packages:**
- `hono`: the framework.
- `@hono/zod-validator`: request validation (§3).
- `zod`: schemas (§3).

| # | Section |
|---|---|
| 1 | [Hono JS: Module layout](#1-hono-js-module-layout) |
| 2 | [Hono JS: Handlers](#2-hono-js-handlers) |
| 3 | [Hono JS: Input validation](#3-hono-js-input-validation) |
| 4 | [Hono JS: Responses](#4-hono-js-responses) |
| 5 | [Hono JS: Errors](#5-hono-js-errors) |
| 6 | [Hono JS: Middleware and auth](#6-hono-js-middleware-and-auth) |
| 7 | [Hono JS: Bindings, database and background work](#7-hono-js-bindings-database-and-background-work) |
| 8 | [Hono JS: Routes and paths](#8-hono-js-routes-and-paths) |
| 9 | [Hono JS: RPC types](#9-hono-js-rpc-types) |
| 10 | [Hono JS: OpenAPI](#10-hono-js-openapi) |

---

## 1. Hono JS: Module layout

**1.1 `[House]` One feature, one module.** Each feature lives in `src/modules/{module}/` (kebab-case) and uses only the folders it needs:

```
{module}/
├── index.ts        # mounts every route file at "/" (1.3)
├── api/            # one route per file + index.ts barrel + index.http (1.2, 1.5)
├── handlers/       # …Svc functions; never import from hono (2.3)
├── queries/        # ORM queries
├── schemas/        # Param / Query / Body / Input schemas (3.2)
├── constants/      # index.ts: every constant in the module (1.7)
├── types/          # {module}-types.ts: every hand-written type (1.8)
├── utils/          # pure functions
└── __tests__/      # {file}.test.ts
```

- Every folder except `__tests__/` has an `index.ts` barrel with named `export *` lines. Other code imports through the barrel (see 8.2). `constants/index.ts` is the exception: it holds the constants itself until it's split (1.7).
- **Every folder is optional.** A module has only the folders it uses: no empty `queries/` in a module that doesn't touch the database, and no empty `utils/` for symmetry.
- Tests live in the `__tests__/` of the folder they test (`handlers/__tests__/`), or at the module root for tests that span folders.

**1.2 `[House]` One route per file.** Each route lives in `{module}/api/{verb}-{thing}.ts` and default-exports its own `new Hono<AppEnv>()`. The barrel `api/index.ts` re-exports each one as `{verbThing}API`.

```ts
// projects/api/index.ts
export { default as listProjectsAPI } from "./list-projects";
export { default as detailProjectAPI } from "./detail-project";
```

**1.3 `[Hono docs]` Split the app with `app.route()`.** `{module}/index.ts` mounts each route file at `"/"` and does nothing else. The parent app mounts the module under its prefix with `app.route("/{module}", …)` ([docs](https://hono.dev/docs/guides/best-practices#building-a-larger-application)).

```ts
// projects/index.ts
const app = new Hono<AppEnv>();
app.route("/", listProjectsAPI);
app.route("/", detailProjectAPI);
export default app;
```

**1.4 `[House]` Always type the app.** Write `new Hono<AppEnv>()`, never `new Hono()`, even for a route that reads no bindings. An untyped sub-app loses `c.env` and `c.get("userId")` typing, and the next person to add a binding gets `any`.

**1.5 `[House]` Every `api/` folder has an `index.http`.** It holds one runnable request per route, so a reviewer can hit the endpoint without reading the frontend.

**1.6 `[House]` Folder names are plural.** A folder that groups one kind of file is named for that kind, in the plural: `constants/`, `handlers/`, `queries/`, `schemas/`, `services/`, `templates/`, `utils/`.
- **Exceptions:** `api/` and `lib/` (abbreviations), `__tests__/`, and feature folders named after the feature (`chat/`, `feedback/`).

**1.7 `[House]` A module's constants live in `{module}/constants/index.ts`.** Limits, timeouts, intervals, retry policies, path prefixes and fixed error messages all go there, including a value only one file uses. A reader then has one place to find every setting in the module, and changing one never means hunting through `handlers/` and `lib/`.

- **Group by topic, not by layer.** Use `// -----` section comments named for what the values are about (threads, stream log, router). Don't make one file or section per folder (`handlers.ts`, `queries.ts`): which folder uses a value changes whenever a new caller appears, and its topic doesn't.
- **Name them `{MODULE}_{TOPIC}_{THING}`** in `SCREAMING_SNAKE_CASE`, with the unit as a suffix for numbers that have one (`CHAT_BOT_STREAM_POLL_MS`, `CHAT_BOT_THREAD_LIST_LIMIT`). The module prefix keeps the name clear once it's away from the file that used it.
- **Import through the folder**: `from "#/modules/{module}/constants"`. Don't declare a module constant in `schemas/`, `handlers/`, `queries/` or `lib/`, and don't re-export it from those barrels.
- **Split by topic when a section outgrows the file.** Once a section has about 15 constants, move it to `constants/{topic}.ts` (`constants/stream.ts`), and `constants/index.ts` becomes a barrel of `export *` lines.
- **Not constants:**
  - Prompt and question text (an LLM prompt, a classifier's instructions) stays beside the code that builds the request. It's content, not a setting.
  - A value computed inside a function (`const cutoff = new Date(...)`) stays in that function.
  - A value shared by several modules goes where 1.9 says, not in one module's `constants/`.
  - A value the frontend also needs (a length limit, a default) goes in the contracts package's `{family}/constants.ts` (Contracts 2.5).
- **Existing modules:** move a module's constants when you're already editing that module, in the same PR.

```ts
// reports/constants/index.ts
// -----
// Export queue
// -----
export const REPORT_EXPORT_BATCH_SIZE = 32;
export const REPORT_EXPORT_POLL_MS = 50;
export const REPORT_EXPORT_RETAIN_MS = 10 * 60 * 1000;

// -----
// Delivery
// -----
export const REPORT_DELIVERY_MAX_ATTEMPTS = 5;
export const REPORT_DELIVERY_TIMEOUT_MS = 4000;
```

**1.8 `[House]` A module's hand-written types live in `{module}/types/`.** Every `type` the module declares by hand goes in `types/{module}-types.ts`, re-exported by `types/index.ts`. That includes a type only one file uses. Unions, function types, `Pick`/`Omit` aliases, contracts like a store or a log interface, a service's result and error types, and Drizzle's `$inferSelect` row types all count.

- **Inferred types stay beside their schema.** `export type X = z.infer<typeof XSchema>` lives in `schemas/`, in the same file as `XSchema`, in the types block at the bottom (Contracts 3.1, 3.8, React 8.3). A type that has a runtime schema is never moved to `types/` or retyped there.
- **Prefer a schema.** If the shape crosses a boundary (a request, a DB row you parse, a stored JSON blob), write a Zod schema in `schemas/` and infer the type, instead of hand-writing it in `types/`.
- **Group by topic**, with `// -----` sections, the same way as `constants/` (1.7). Split into `types/{topic}.ts` once a section grows past about 15 types.
- **Import through the folder**: `from "#/modules/{module}/types"`. Don't declare a type in `handlers/`, `queries/`, `lib/` or `api/`.
- **`type`, not `interface`**, for both data shapes and contracts.
- **Not moved:**
  - A re-export of a library's type (`export type { StreamChunk }`) stays where it is.
  - Generic type parameters and inline types inside a signature (`(ctx: { runId: string }) => …`) aren't declarations.
- **Existing modules:** move a module's types when you're already editing that module, in the same PR as its constants (1.7).

```ts
// reports/types/reports-types.ts
// -----
// Export queue
// -----
export type ReportExportStatus = "completed" | "failed";
export type ReportExportCursor = { exportId: string; seq: number };

// -----
// Delivery
// -----
export type ReportsEnv = Pick<Bindings, "MAIL_API_KEY" | "SELF">;
export type DeliverReportResult = { exportId: string; reportId: string };
```

**1.9 `[House]` Anything used by more than one module moves out of the module.** As soon as a second module needs something, it moves to the app's shared folder for its kind. Modules sit in groups (`src/modules/{group}/{module}/`, for example `api-frontend/`, `api-core/`), and the group doesn't matter: two modules in the same group share the same way.

| What | Used by | Goes in | Import from |
|---|---|---|---|
| Anything | One module | That module | Its own folders |
| Zod schemas that aren't a database row (pagination, envelopes, shared params and bodies) | Two or more modules | `src/schemas/` | `#/schemas` |
| A database row schema | Two or more modules | The module that owns the table (see below) | `#/modules/{group}/{module}/schemas` |
| Functions, helpers, wrappers, hand-written types, constants | Two or more modules | `src/lib/` | `#/lib/{file}` |
| Anything | Another app or workspace too | A `packages/*` package | `@repo/{package}` |

- **Never import from another module's folders.** That covers its `utils/`, `lib/`, `types/`, `constants/`, `handlers/` and `queries/`, and its `schemas/` except for row schemas (below). When a second module needs something, move it in the same PR, then import it from its new home in both modules. A module's internals change for its own reasons, and a sibling that reaches in breaks without warning.
- **A row schema stays with the module that owns its table.** It describes that table, so it changes when the table does, and the owning module is where that happens. Another module may import it through the owner's `schemas` barrel when its query joins that table only to read and display it (see the app's ADRs). Copy it only when the shape really differs (a column subset, a computed field).
- **`src/schemas/` has an `index.ts` barrel** with `export *` lines, like a module's `schemas/`. Files are `{thing}-schema.ts`, and each inferred type sits in the same file as its schema, at the bottom (1.8, Contracts 3.8).
- **No in-between shared folders.** There's no `{group}/shared/`. `src/schemas/` and `src/lib/` are the shared homes in the app.
- **Name files for what they are,** with the same suffixes modules use: `pagination-schema.ts`, `image-types.ts`, `resolve-image-url.ts`. Never name a file after the module it came from.
- **Only data shapes and pure code move.** Business logic or DB access that two modules need means two modules own one thing: make it its own module and call it (1.1). `src/lib/` never holds queries against a module's tables.
- **Third-party packages are imported directly** in every module that uses them (`@tanstack/ai`, `effect`, `zod`). Only a wrapper that configures one, such as a client factory, an adapter or a retry policy, is shared code, and it goes in `src/lib/`.
- **Existing code:** move a shared piece when you're already editing one of the modules that uses it, in the same PR.

```ts
// before: orders reaches into two other places
import { withResolvedImage } from "#/modules/media/utils";
import { PaginationSchema } from "#/modules/reports/schemas/pagination-schema";

// after: a shared helper lives in src/lib/, a shared non-row schema in src/schemas/
import { withResolvedImage } from "#/lib/resolve-image-url";
import { PaginationSchema } from "#/schemas";

// a row schema stays with the table's owner, imported for a read-only join
import { ProductSchema } from "#/modules/products/schemas";
```

---

## 2. Hono JS: Handlers

**2.1 `[Hono docs]` Write the handler inline, right after the path.** No controller classes and no handler functions defined elsewhere and passed in by name. Hono can only infer path params and validated input when the handler sits inline ([docs](https://hono.dev/docs/guides/best-practices#don-t-make-controllers-when-possible)). If a handler really must be shared, build it with `createFactory().createHandlers(...)` from `hono/factory`.

**2.2 `[House]` Keep handlers thin.** A handler does five things, in this order:

1. Read validated input (`c.req.valid(...)`).
2. Read the caller (`c.get("userId")`).
3. Open the DB (`db_connect(...)`).
4. Call **one** `…Svc` function.
5. Return the envelope.

No ORM queries, branching business rules or data reshaping. Those belong in `handlers/` or `queries/`.

```ts
app.patch(
  "/:id",
  zValidator("param", ProjectIdParamSchema),
  zValidator("json", RenameProjectBodySchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { name } = c.req.valid("json");
    const db = db_connect(c.env.DATABASE_URL);
    const data = await renameProjectSvc(db, c.get("userId"), id, name);
    return c.json({ data, error: null });
  },
);
```

**2.3 `[House]` Services never import from `hono`.** Nothing under `handlers/`, `queries/` or `lib/` takes a `Context`. Pass plain values: `db`, `userId`, the validated input, and specific bindings. That keeps services testable without a request.

**2.4 `[Hono docs]` Don't define HEAD handlers.** Hono answers HEAD by running the GET route and dropping the body ([docs](https://hono.dev/docs/guides/best-practices)).

- **Not adopted:** Hono's docs also show middleware that returns early for HEAD requests (`if (c.req.method === "HEAD") c.res = new Response(null, c.res)`) to skip expensive work. We don't use it, because no route needs HEAD to behave differently from GET. Add it only if a route has a real HEAD use case, such as a client checking whether a large file exists without downloading it.

---

## 3. Hono JS: Input validation

**3.1 `[House]` Validate every input with `zValidator`.** Route params, query strings and JSON bodies all go through `zValidator("param" | "query" | "json", Schema)`, and handlers read them with `c.req.valid(...)`. Never use `c.req.param()`, `c.req.query()`, `c.req.json()` or `new URL(c.req.url).searchParams`.

- **Exception:** a streaming helper that needs the raw `Request` (for example to resume an SSE stream) may be passed `c.req.raw`. Anything the handler itself reads must still be validated.
- **Exception:** middleware that runs before the routes (for example `requireSession`) may read one value with `c.req.query()`, because `c.req.valid` isn't set there. It must parse the value with a Zod schema in the same function. The lint config lists each such file with its reason.

**3.2 `[House]` Define schemas in `schemas/`, never inline in the route file.** Names follow `{Module}{Thing}{Target}Schema`:

| Used for | Name | Example |
|---|---|---|
| `zValidator("param")` | `…ParamSchema` | `ProjectIdParamSchema` |
| `zValidator("query")` | `…QuerySchema` | `ProjectSearchQuerySchema` |
| `zValidator("json")` | `…BodySchema` | `CreateProjectBodySchema` |
| Service payload after `userId` is merged in | `…InputSchema` | `ProjectListInputSchema` |

**3.3 `[House]` Numeric query params use `z.coerce.number()`.** Query strings arrive as strings.

```ts
limit: z.coerce.number().int().min(1).max(100).default(25),
```

**3.4 `[Hono docs]` Header keys are lowercase** in a `zValidator("header")` schema (`"idempotency-key"`, not `"Idempotency-Key"`) ([docs](https://hono.dev/docs/guides/validation)).

**3.5 `[Hono docs]` JSON validation needs the header.** `zValidator("json")` only parses the body when the request has `Content-Type: application/json`. Without it the body is `{}`. Every `index.http` request with a body must send the header ([docs](https://hono.dev/docs/guides/validation)).

---

## 4. Hono JS: Responses

**4.1 `[House]` Wrap every JSON response in the envelope.** Success returns `{ data, error: null }`, and errors return `{ data: null, error: { code, message } }`. Never return a bare object with `c.json(result)`.

- **Exception:** a success body that a third-party client parses itself, in a shape that client fixes. For example, a payload that a third-party SDK reads as `{ items }`. Return it bare, say why in a comment where it's built, and still send its errors through `app.onError` in the envelope. The frontend calls the route with that client, not through `apiClient` (React 3.1 streaming exception).

**4.2 `[House]` Status codes.**

| Case | Status |
|---|---|
| Read, update, delete | `200` (default) |
| Create | `201`, passed explicitly as `c.json({ data, error: null }, 201)` |
| Error | set by the thrown `AppError` subclass (see §5) |

**4.3 `[House]` Non-JSON responses are allowed only when the resource itself isn't JSON.** Image bytes use `new Response(object.body, { headers })`, email previews use `c.html` / `c.text`, and streams return an SSE `Response`. Set `Content-Type` and `Cache-Control` explicitly on binary responses.

---

## 5. Hono JS: Errors

**5.1 `[House]` Never catch errors in a route.** No `try/catch` and no `tryCatch` inside `api/`. Errors bubble up to the app's `app.onError`, which turns them into the envelope.

**5.2 `[House]` Throw `AppError` subclasses from the app's shared errors file.** Use `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ConflictError`, `ExternalServiceError` and so on. They carry the `code` and `statusCode` that `app.onError` writes into the envelope. Don't throw `HTTPException` from module code: `onError` maps it to the generic code `HTTP_ERROR`, and the client can't tell errors apart.

- **Not adopted:** Hono's exception docs suggest `return err.getResponse()` for an `HTTPException` in `onError` ([docs](https://hono.dev/docs/api/exception)). We don't follow that. `getResponse()` returns a plain-text body, so the client would get `Unauthorized` instead of `{ data: null, error: { code, message } }`. It also ignores headers already set on the context. That includes CORS headers, so the browser would block the error response. Our `onError` wraps an `HTTPException` in the envelope instead, and module code throws `AppError` subclasses.

**5.3 `[House]` Validation failures must come back in the envelope too.** By default, `@hono/zod-validator` returns `400` with `{ success: false, error: <ZodError> }`, which skips `app.onError` and breaks the envelope. Routes should use a shared validator that passes a failure hook and throws `ValidationError`, so every 400 has the same shape as every other error.

**5.4 `[House]` Only `app.onError` logs a 500.** It logs the unknown error with `console.error` and returns the fixed message `"Internal server error"`. It never sends `err.message`, a stack trace or a DB error text to the client.

**5.5 `[House]` The top-level app defines `app.notFound`**, so an unknown path returns `{ data: null, error: { code: "NOT_FOUND", … } }` instead of Hono's plain-text `404 Not Found`.

- **Only the top-level app.** Hono calls `notFound` only on the app that serves the request (the one whose `fetch` is exported). A `notFound` on a sub-app mounted with `app.route()` is never called, so it goes in `src/index.ts` even when a sub-app owns `onError`.

---

## 6. Hono JS: Middleware and auth

**6.1 `[House]` The caller comes from the session and nowhere else.** The global session middleware sets `userId`, and handlers read it with `c.get("userId")`. Never accept a user id from the path, query or body. When a service needs `userId` merged into its input, the route does the merge (`{ ...body, userId }`), and the client-facing `…BodySchema`/`…QuerySchema` doesn't contain `userId`.

**6.2 `[House]` A public route must be declared in the app index.** A route that skips the session goes on the allowlist in the app's `index.ts` session middleware, with a comment saying why it has to be public. Match the most specific path you can (`/emails/unsubscribe`, not `/unsubscribe`). A loose match such as `includes("/images")` also opens any future route whose path happens to contain that text.

**6.3 `[Hono docs]` Write new typed middleware with `createMiddleware<AppEnv>()`** from `hono/factory`, so what it passes along with `c.set` / `c.get` stays typed.

**6.4 `[House]` Middleware order in an app index:** env context, then CORS, then public auth routes (`/auth/*`), then the session check, then `onError` / `notFound`, then `app.route(...)` mounts. CORS must come before the auth check, or preflight `OPTIONS` requests fail with 401.

---

## 7. Hono JS: Bindings, database and background work

**7.1 `[House]` Read bindings from `c.env` in the route.** Pass the specific binding a service needs (`c.env.IMAGES_BUCKET`), or `c.env` itself when the service needs several. A global env accessor is only for deep library code that can't be handed `env`. Workers has no `process.env`.

**7.2 `[House]` Pick the database connection on purpose.** When the app has both a cached (or replica) connection and a realtime (primary) one:

- Cached: the default.
- Realtime: use it when the service reads something that must show a write made earlier in the same flow. For example, "am I subscribed right now" or a check just before an upsert. Add a one-line comment in the route saying why.

**7.3 `[House]` Never leave background work running without a handle.** Work that outlives the response goes through `c.executionCtx.waitUntil(promise)`. A floating promise can be killed when the response ends.

---

## 8. Hono JS: Routes and paths

**8.1 `[House]` New routes are REST-shaped.**

```
GET    /            list
GET    /:id         one
POST   /            create   → 201
PATCH  /:id         update
DELETE /:id         delete
```

Sub-resources nest under the parent: `POST /:id/members`, `DELETE /:id/members/:memberId`.

- Don't add verb paths (`/list`, `/get`, `/upsert`, `/search`). Leave existing ones as they are.
- Use `POST` for a read only when the input can't fit in a query string (for example, a long item list). Say so in a comment.

**8.2 `[House]` Imports use the `#/` alias.** Write `#/modules/{module}/handlers`, not `../handlers/...`. Import through the module's barrel (`handlers/index.ts`, `schemas/index.ts`), not a single file inside it.

---

## 9. Hono JS: RPC types

**9.1 `[Hono docs]` `AppType` is exported only from the app entry** (`src/index.ts`). Sub-apps never export route types.

**9.2 `[House]` No Hono RPC client (`hc`).** Frontends call the API through a TanStack Start `createServerFn` plus an API client, with Zod schemas from the shared contracts package (see React §3). So route files register routes as separate statements (`app.get(...)`), and don't need chaining.

- **Not adopted:** Hono's RPC guide has route files chain (`new Hono().get(...).post(...)`) so `hc<AppType>` can infer every path and response type ([docs](https://hono.dev/docs/guides/rpc)). We don't follow it, because no frontend uses `hc`. Don't rewrite route files to chain, and don't add `hc` to a frontend. If that decision changes, update this rule and React 3.1 together.

## 10. Hono JS: OpenAPI

**10.1 `[House]` Every route has a `describeRoute` doc.** Put it in `{module}/openapi/{verb-thing}.ts`, export `{verbThing}Doc`, and pass it right after the path: `app.get("/", listThingsDoc, zValidator(...), handler)`. A route without one still shows in the spec (its `zValidator` registers it) but has no summary, so the spec test fails.

**10.2 `[House]` Params, query, headers and bodies document themselves.** `#/lib/zod-validator` is built on `hono-openapi`'s `validator`, so never describe those by hand. The doc covers what the validators can't: `summary`, `description`, `tags`, `security`, the account query of staff routes, and `responses`.

**10.3 `[House]` Describe each response with `envelope()`.** `jsonResponse("…", envelope(XSchema))` for the 200, then `...errorResponses(400, 401, 404)` for the failures the route can return. Streaming routes use `text/event-stream` and the `X-Thread-Id` header.

**10.4 `[House]` Write the description with `routeText`.** It has three parts: *Context* (why a caller needs the route), *What happens* (numbered steps, short sentences, words from the app's `GLOSSARY.md`) and *Example* (one `curl` a beginner can copy, with the answer). Use the `EXAMPLE_*` ids from `#/lib/openapi` so every example tells one story.

**10.5 `[House]` The spec is for developers.** `GET /openapi.json` and the Scalar page `GET /docs` answer only when `ENVIRONMENT` is `development`; every other value is a 404. A new tag goes in `openApiDocument` (`#/lib/openapi-document`).

---

# React

**Covers:** a frontend app's `src/`: feature modules (`src/modules/`), routes (`src/routes/`), and the app-wide folders `src/components/ui`, `src/lib`, `src/constants`.

**Doesn't cover:** marketing sites or other apps with a separate visual language.

**Packages:**
- `react`, `react-dom`: the UI library. The React Compiler is **not** enabled (§6.4).
- `@tanstack/react-start`: SSR and server functions (§3).
- `@tanstack/react-router`: file-based routes (§2).
- `@tanstack/react-query`: data fetching and cache (§4).
- `@tanstack/react-form`: forms (§5.4).
- `zod`: schemas (§3, §8.3).
- `tailwindcss`: styling (§7).
- shadcn/ui, with `clsx` and `tailwind-merge` behind `cn()`: UI primitives (§7.1, §7.2).
- `lucide-react`: icons (§5.5).
- `oxlint`: lint (§8.1).
- `vitest`: tests (§8.4).

**Other sources a reviewer also checks, where the app has them:**
- The app's design-system usage rules (cards, pills, prices, colors).
- A UI registry listing the exact classes of registered components.
- Custom lint rules, one file per rule with its reason.

| # | Section |
|---|---|
| 1 | [React: Module layout](#1-react-module-layout) |
| 2 | [React: Routes](#2-react-routes) |
| 3 | [React: Server functions](#3-react-server-functions) |
| 4 | [React: Data fetching with TanStack Query](#4-react-data-fetching-with-tanstack-query) |
| 5 | [React: Components](#5-react-components) |
| 6 | [React: Effects, state and SSR](#6-react-effects-state-and-ssr) |
| 7 | [React: Styling and UI](#7-react-styling-and-ui) |
| 8 | [React: TypeScript, lint and tests](#8-react-typescript-lint-and-tests) |

---

## 1. React: Module layout

**1.1 `[House]` One feature, one module.** Each feature lives in `src/modules/{module}/` (kebab-case) and uses only the folders it needs:

```
{module}/
├── index.ts        # root barrel: re-exports every folder below
├── api/            # createServerFn wrappers (§3)
├── hooks/          # query keys, query options, query and mutation hooks (§4)
├── components/     # React components
├── schemas/        # Zod schemas + z.infer types   (plural: "schemas")
├── constants/      # frontend-only values; shared ones come from contracts (Contracts 2.5)
├── types/          # types that don't come from a schema
├── utils/          # pure functions
└── prototypes/     # throwaway UI, see 1.6
```

Every folder has an `index.ts` barrel with named `export *` lines, and the module root `index.ts` re-exports all of them.

- **Folder names are plural.** A folder that groups one kind of file is named for that kind, in the plural: `schemas/`, `constants/`, `hooks/`, `components/`, `types/`, `utils/`, `prototypes/`, `animations/`. So it's `schemas/`, never `schema/`. This matches the backend (`handlers/`, `queries/`, `schemas/`).
  - **Exceptions:**
    - `api/` and `lib/`: abbreviations, kept as they are.
    - `__tests__/`: already plural.
    - Folders under `src/routes/`: they become URL segments, so the URL decides the name.
    - Feature folders under `src/modules/` (`chat/`, `billing/`): named after the feature, not a kind of file.
  - **Existing singular folders:** leave them alone unless you're already editing that module. When you do, rename the folder in the same PR and update its imports.
- **Create `types/` only when needed.** Most types are `z.infer<typeof XSchema>` and live next to their schema in `schemas/` (see 8.3). Add `types/` only for types with no runtime schema, such as component-only unions or UI state. Don't create an empty `types/` for symmetry.
- **Every other folder is optional too.** A module has only the folders it uses: no empty `utils/` and no `api/` in a UI-only module.

**1.2 `[House]` File and symbol names carry the module name.** Files are `{module}-{thing}.tsx` and export `{Module}{Thing}`. For example, `projects-item.tsx` exports `ProjectItem`, and a search for "Project" finds every piece of the feature.
- Hooks are `use-{thing}.ts` exporting `use{Thing}`.
- `modules/shared` is exempt. Its components are named for what they are (`back-link.tsx`).

**1.3 `[House]` Import another module through its root barrel only.** Write `import { ProjectsList } from "#/modules/projects"`, never `#/modules/projects/components/projects-list`. Inside a module, import sibling folders relatively (`from "../hooks"`). A deep import ties you to another module's file layout, so moving one file there breaks your module.

**1.4 `[House]` Use the `#/` alias.** `#/*` is the alias declared in `package.json` `imports`. If an older `@/*` tsconfig alias also resolves, don't add new `@/` imports; switch a file's `@/` imports to `#/` when you're already editing it.

**1.5 `[House]` Code used by two or more modules goes in `modules/shared`.** App-wide infrastructure goes in `src/lib` (the API client, `tryCatch`, `cn`) and `src/constants`. `src/components/ui` holds shadcn primitives only, never feature components.

**1.6 `[House]` Prototypes stay isolated.** Throwaway UI lives in `{module}/prototypes/` and is reached only through `src/routes/prototype/*` (a URL, so it stays singular; see 1.1). Production code never imports from a `prototypes/` folder. Delete the prototype once the real feature ships.

---

## 2. React: Routes

**2.1 `[House]` Keep route files thin.** A route file declares the route and renders **one** module component. Data preloading and redirects are allowed. No JSX layout, hooks or data shaping beyond that; those belong in the module.

```tsx
// routes/_app/projects/$id.tsx
export const Route = createFileRoute("/_app/projects/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProjectSuspenseDetailMain />;
}
```

**2.2 `[House]` Preload in `loader` with the module's query options.** Loaders fill the cache with `context.queryClient.query({ ...xQueries.y(), … })`, so components render from cache. Data many child routes need is loaded once in the layout route. Independent requests run in parallel with `Promise.all`.

**2.3 `[House]` Auth redirects go in `beforeLoad`.** Throw `redirect(...)` from `beforeLoad`, never from a component or an effect. The session is in `context.user`, set once by the root route.

**2.4 `[TanStack docs]` Name the route in `useParams`.** Components tied to one route call `useParams({ from: "/_app/projects/$id" })`, which gives typed params. `strict: false` ignores `from` and loosens the params to `Partial<AllParams>` ([docs](https://tanstack.com/router/latest/docs/framework/react/api/router/useParamsHook)), so use it only in shared hooks that run under several routes.

**2.5 `[House]` Never edit `src/routeTree.gen.ts`.** The dev server regenerates it.

**2.6 `[House]` Server routes under `routes/api/` only proxy.** A server route's `handlers` forward the request to a function in the module's `api/` folder. The logic lives in the module.

---

## 3. React: Server functions

**3.1 `[TanStack docs]` Every backend call is a `createServerFn` in `{module}/api/`** ([docs](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)). Components and hooks call the server function, never `apiClient` or `fetch` directly.

The one standard way to reach the backend is **`createServerFn` + `apiClient` + a Zod response schema**:
- The browser calls the server function.
- The server function runs on the frontend's server and calls the backend through `apiClient`, which adds the auth token and `Origin` header.
- The response is parsed with `apiResponseSchema(...)`, so a changed backend shape fails loudly at the boundary instead of leaking bad data into components.

- **Not adopted:** the Hono RPC client (`hc` from `hono/client`). Don't use `hc`, and don't call the backend from the browser directly. Types come from the Zod schemas in the shared contracts package, not from the backend's `AppType` (see Hono JS 9.2).
- **Exception:** streaming transports (for example an AI chat stream) may call `fetch` directly, because a server function can't carry a stream.

**3.2 `[TanStack docs]` `GET` for reads, `POST` for writes.** Use `createServerFn({ method: "POST" })` for every create, update and delete, even when the backend verb is `PATCH` or `DELETE`.

**3.3 `[TanStack docs]` Validate input with `.validator(Schema)`.** Every server function that takes input declares a Zod schema. Use whichever of `.validator()` / `.inputValidator()` your installed TanStack Start version doesn't mark deprecated, and use it consistently.

**3.4 `[House]` Same shape in every server function.** Call `apiClient` with an `apiResponseSchema(...)` response schema, wrap the call in `tryCatch`, rethrow a plain `Error`, and return `data.data`.

```ts
export const renameProject = createServerFn({ method: "POST" })
  .validator(RenameProjectActionSchema)
  .handler(async ({ data: { projectId, name } }) => {
    const { data, error } = await tryCatch(
      apiClient.patch(`/projects/${projectId}`, ProjectResponseSchema, { name }),
    );
    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to rename project");
    }
    return data.data;
  });
```

- The error message for the user comes from the backend when it sends one (`ApiError.message`). Otherwise it's a fixed `"Failed to {verb} {thing}"`.
- Never return the raw `ApiError`. It carries the full response body, and a server function sends whatever it returns to the browser.

**3.5 `[House]` Shared shapes come from the contracts package.** When the backend already defines a schema (`ProjectListItemSchema`, `CreateProjectBodySchema`), import it; don't redefine it in `schemas/`. `schemas/` holds only frontend-only shapes: response envelopes and server-function action inputs.

---

## 4. React: Data fetching with TanStack Query

**4.1 `[TanStack docs]` Each module exports `{module}Keys` and `{module}Queries`.** Keys are nested under one `all` root and typed `as const`. Query options are built with `queryOptions()`, so `useQuery`, loaders and `setQueryData` share one key and function ([docs](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)).

```ts
export const projectsKeys = {
  all: ["projects"] as const,
  list: () => [...projectsKeys.all, "list"] as const,
};

export const projectsQueries = {
  list: () =>
    queryOptions({
      queryKey: projectsKeys.list(),
      queryFn: () => fetchProjects(),
      staleTime: 1000 * 60,
    }),
};
```

**4.2 `[House]` Components read data through the module's hooks.** Every query gets a hook in `hooks/`: `use{Module}` and `useSuspense{Module}`. A page reads with the suspense hook (4.5); the plain hook is for non-page reads that need `enabled` or other `useQuery` options. A component may call `useQuery` directly only by spreading a `{module}Queries` entry, for example to add `enabled`. It never writes `queryKey` or `queryFn` inline, because an inline key drifts from the one the loader and mutations use.

**4.3 `[House]` Mutations live in a `use{Module}Actions` hook.** It returns one `useMutation` per action (`createProject`, `renameProject`, …). After success, update the cache with `setQueryData` or invalidate by `{module}Keys`, never with a hand-typed key.

**4.4 `[TanStack docs]` Optimistic updates follow the documented steps** ([docs](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)):
1. In `onMutate`, call `cancelQueries`.
2. Snapshot the current data with `getQueryData`.
3. Write the optimistic value with `setQueryData`, and return `{ previous }`.
4. In `onError`, restore `previous`.

Keep the optimistic reshaping in named pure functions (`addOptimisticMember`), not inline in `setQueryData`.

When one query is cached under several keys with a shared prefix (a list cached once per filter), snapshot with `getQueriesData` and write with `setQueriesData` on that prefix. `optimisticEdit` in `src/lib/optimistic-cache.ts` wraps all four steps plus the reload on settle: pass it the key, the `mutationFn`, the pure function and the reload. Use it instead of hand-writing the steps; write them out only when one mutation edits caches of different shapes.

**4.5 `[House]` Every page suspends, and comes in a pair.** A route's page component is never a plain `useQuery` view, even when the loader has already filled the cache: a failed or skipped prefetch must show a skeleton, not an empty state. `{Module}Suspense{Thing}Main` wraps a private view in `<Suspense fallback={…skeleton…}>`, and the view calls `useSuspense{Module}`. The fallback uses the module's `{Module}{Thing}Skeleton`, shaped like the real content so the page doesn't jump.

**4.6 `[House]` Never copy server data into `useState`.** Read it from the query each render. A copy goes stale the moment the cache updates.

**4.7 `[House]` Make a mutation optimistic only when the client can predict the result.** Good fits: a reorder, a rename, a flag flip, removing a row. Keep these plain (reload after success): creates (the server makes the id), anything the server cascades to other rows (deleting a category), and any edit whose row component is keyed by its content, because an early cache write remounts the row and the "save failed" message is lost with it.

---

## 5. React: Components

**5.1 `[House]` Named function components.** Write `export function ProjectItem(props)`. No default exports and no `React.FC`. Props are a `type {Component}Props` declared above the component, not an `interface`.

**5.2 `[House]` One exported component per file.** Small private pieces in the same file are fine: a label helper, or the inner view of a Suspense pair. The file name matches the exported component.

**5.3 `[House]` Each folder does one kind of job.**
- Components render. They don't call `fetch` or `apiClient`.
- Hooks hold logic and return data or callbacks, never JSX.
- Utils are pure functions: no hooks, no side effects.
- Loaders (`loaders/`) fill the query cache for route loaders. They take a `QueryClient` and call `queryClient.query(...)`; components never import them.

Put business logic in `utils/` so it can be tested without rendering (`nextProjectName`, `composeProjectItem`).

**5.4 `[House]` Forms use TanStack Form with a Zod schema from `schemas/`.** Don't hand-roll `useState` per field.

**5.5 `[House]` Icons come from `lucide-react`.**

---

## 6. React: Effects, state and SSR

**6.1 `[React docs]` Use an effect only to sync with something outside React** ([docs](https://react.dev/learn/you-might-not-need-an-effect)). Timers, subscriptions, `requestAnimationFrame`, DOM measurement, dynamic `import()` and cache invalidation after a stream ends are all fine. These aren't:
- **Deriving data:** compute it during render instead.
- **Reacting to a click or submit:** do it in the event handler.
- **Resetting state when a prop changes:** give the component a `key` instead.
- **Firing a request on mount** (for example a logout): do it in the route's `loader` / `beforeLoad` or an event handler.

**6.2 `[React docs]` Effects clean up after themselves.** Clear timers, cancel animation frames, and ignore late async results with a `cancelled` flag ([docs](https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development)).

**6.3 `[House]` No `eslint-disable` for effect dependencies.** If the dependency list is wrong without the disable comment, the effect is the wrong tool (see 6.1).

**6.4 `[House]` Memoize only with a reason.** The React Compiler is off, so `useMemo`, `useCallback` and `memo` are manual. Use them when a value feeds a dependency list, a memoized child, or a measurably slow calculation. Leave a short comment when the reason isn't obvious.

**6.5 `[House]` Browser APIs are SSR-safe.** Every module also runs on the server during SSR. Touch `window`, `document` and `localStorage` only inside effects or event handlers, or behind `typeof window !== "undefined"`. Wrap `localStorage` access in `try/catch`, because it throws in private mode and when storage is blocked.

---

## 7. React: Styling and UI

**7.1 `[House]` Build from shadcn primitives in `#/components/ui`.** Use `Button`, `Card`, `Dialog`, `Select` and so on, not raw `<button>` / `<input>` for interactive UI. A change inside `components/ui/` affects every screen, so the PR must say so.

**7.2 `[House]` Combine classes with `cn()`.** Write `cn("base", isActive && "active", className)`, not template-literal `className={\`…\`}`. `cn` also merges conflicting Tailwind classes correctly.

**7.3 `[House]` Colors come from tokens only.** Use theme tokens (`text-foreground/60`, `bg-card`, `text-destructive`). No hex values and no raw palette classes (`text-red-600`, `bg-zinc-100`) in a feature module.

**7.4 `[House]` Follow the design-system rules and the UI registry, where the app has them.** When you change a component listed in the UI registry, update its row and its "Last updated" date in the same PR.

**7.5 `[House]` Inline `style` only for what a class can't express.** For example, a runtime value such as a computed width or color. Everything else is a Tailwind class.

---

## 8. React: TypeScript, lint and tests

**8.1 `[House]` The app's lint command passes.** oxlint runs the correctness and suspicious categories plus any custom rules. The ones that shape everyday code:
- **No `unknown` in parameters (except `cause`), return types or type aliases.** Parse unknown input at the boundary (a Zod schema), then pass named types.
- **No broad `object` parameters.** Accept a named type.
- **Every type assertion (`as`) needs a `// SAFETY:` comment** right above it, saying why the assertion holds.
- **No chained assertions** (`as unknown as T`) and no widen-then-assert.
- **No module mocking in tests** (`vi.mock`). Pass dependencies in instead.

**8.2 `[House]` No `any`.** Even where no lint rule enforces it. Use a named type, or `unknown` at a boundary and parse it.

**8.3 `[House]` Types come from schemas where one exists.** Write `export type X = z.infer<typeof XSchema>` in the same `schemas/` file as the schema, at the bottom (Contracts 3.8). Use `types/` only for types with no runtime schema. Prefer `type` over `interface`.

**8.4 `[House]` Tests live in `__tests__/` next to the code they test** and are named `{file}.test.ts(x)`. Test pure `utils/` first. They carry most of the logic and need no rendering or mocks.

---

# Contracts

**Covers:** the shared contracts package (for example `@repo/contracts`), and how apps import from it.

**Doesn't cover:** app-only schemas. Those follow the Hono JS or React scope of the app that owns them.

**Packages:**
- `zod`: the only dependency (§1.2).

**What it is:** one package of Zod schemas and the TypeScript types inferred from them. It describes the JSON that travels between workspaces: a backend's response, a frontend's request body, the values of an enum. Both sides import the same schema, so they agree on the shape. For example, `CreateProjectBodySchema` (`name: z.string().trim().min(1)`) is the rule the web form checks against *and* the rule the API's `zValidator` checks against.

| # | Section |
|---|---|
| 1 | [Contracts: Role in the monorepo](#1-contracts-role-in-the-monorepo) |
| 2 | [Contracts: Layout and entry points](#2-contracts-layout-and-entry-points) |
| 3 | [Contracts: Schema design](#3-contracts-schema-design) |
| 4 | [Contracts: Enums and the database](#4-contracts-enums-and-the-database) |
| 5 | [Contracts: Changing a contract](#5-contracts-changing-a-contract) |

---

## 1. Contracts: Role in the monorepo

```
                 packages/contracts   (depends on zod only)
                /                    \
        /{family-a}               /{family-b}
         |                          |
   backend-a, frontend-a      backend-b, frontend-b, mobile-b

   database packages  ── separate; they don't import contracts (see §4)
```

**1.1 `[House]` A contract is a shape that crosses a workspace boundary.** Put a schema here only when two or more workspaces need it. The usual case is a backend and the frontend that calls it. A shape used by one app stays in that app's `schemas/` folder.

**1.2 `[House]` Contracts depend on `zod` and nothing else.** No imports from database packages, `hono`, `react`, shared packages, or any app. Every app can import contracts without pulling in a database driver or a UI library. The arrow only goes the other way: a shared package may import contracts (Shared packages 2.5).

**1.3 `[House]` Consumers use the same Zod major version as the package.** An app on an older major version must not import contracts until it upgrades, because schemas from two major versions don't mix.

**1.4 `[House]` No build step.** `package.json` `exports` point straight at the `.ts` source, and each consumer's bundler (Vite, Wrangler) compiles it. Don't add a `dist/` build or point `exports` at compiled files. Consumers depend on it as `"workspace:*"`, so every app always sees the current source. The `version` field isn't used.

**1.5 `[House]` Decide where a schema lives by who reads it.** Before adding or reviewing a schema, ask two questions:

1. **Does another app use this shape?** Search the other app for the schema's name, and for a schema with the same fields under another name (`ChatBotStreamBodySchema` in the backend was `ChatBotSendInputSchema` in the frontend).
2. **If it does, is it on the wire or in the database?** A wire shape is something one app sends in a request or returns in a response.

| Finding | Where it goes | Rule |
|---|---|---|
| Only one app uses it | that app's `schemas/` | 1.1 |
| It parses a raw database row | the app, next to its query, named `{Entity}RowSchema` | 3.6 |
| The other app sends or receives it | contracts | 1.1 |
| The other app has its own copy | contracts, and every copy is deleted in the same PR | 3.7, React 3.5 |
| Contracts already has the same shape | import the contract, and delete the app's schema | 3.7 |
| Only one side adds to it (an envelope, a `userId` from the session) | the contract in contracts; the addition in that app, built with `.extend()` or a wrapper | 3.3 |

- **A copy is the thing to look for.** Two schemas for one shape drift without any error. For example, the frontend's `ChatBotThreadListItemSchema` typed `createdAt` as `z.string()` while the backend's coerced it to an ISO string. Finding a copy settles the question: the shape is a contract.
- **A row column whose stored value is already the wire shape uses the contract for that column.** A jsonb blob with no dates and no hidden fields looks the same in the database and on the wire. Example: `layout` on a document row. The row schema stays in the app (3.6), but its column is `LayoutSchema.nullable()` from contracts, not a copy.
- **A wire shape the other side doesn't parse may stay in the app until it does.** When the receiving app only passes the payload through, or reads it with a loose `.passthrough()` schema, there's no second copy to drift yet. For example, a payload that an SDK on the other side passes straight through. Move it to contracts in the same PR that makes the other side parse it strictly.
- **A name that hides a contract counts as a copy.** If two apps describe the same request or response under different names, rename while moving. The contract uses the 3.2 names, and a response shape is never called `…RowSchema` (3.6).

---

## 2. Contracts: Layout and entry points

**2.1 `[House]` One subpath per product family.** Each family has its own folder and its own entry in `package.json` `exports`:

| Import path | Folder |
|---|---|
| `@repo/contracts/{family}` | `src/{family}/` |

- Apps import from their family's subpath, never the package root.
- A new product family gets a new folder **and** a new `exports` entry, not more files in the root.

**2.2 `[House]` One folder per entity.** Inside a family:

```
{family}/
├── index.ts          # export * from every entity + constants + enums
├── constants.ts      # shared non-enum values (2.5)
├── enums.ts          # every *_VALUES array for the family, nothing else
└── project/          # entity name, singular, kebab-case
    ├── index.ts      # export * from "./dto"
    └── dto.ts        # schemas + inferred types
```

- Entity folders are named after the entity (`project/`, `team-member/`), like feature folders. So they're exempt from the plural-folder rule, and they stay singular.
- A schema that uses another entity imports that entity's barrel (`from "../team"`), not its `dto.ts`.

**2.3 `[House]` Import only through an `exports` entry.** Write `from "@repo/contracts/{family}"`. Never write `@repo/contracts/src/...` or a path to a single entity folder. Those aren't in `exports`, and a deep path ties the app to the package's file layout.

**2.4 `[House]` Barrels use `export *`.** Entity barrels and family barrels re-export with `export *`.

**2.5 `[House]` A family's constants live in `{family}/constants.ts`.** Limits, defaults and patterns that both sides need go there: a title's max length, a field's default value, a slug regex. `enums.ts` holds only `*_VALUES` arrays. A plain value is not an enum.

- **Schemas use the constant by name.** Write `.max(CHAT_BOT_THREAD_TITLE_MAX)`, not `.max(120)`. The frontend can then use the same number outside the schema, for example in a `maxLength` or a "47 / 120" counter, without retyping it.
- **Name them `{FAMILY}_{TOPIC}_{THING}`** in `SCREAMING_SNAKE_CASE`, with the unit as a suffix for numbers that have one, the same as app constants (Hono JS 1.7).
- **Group by topic** with `// -----` section comments.
- **Who reads the value decides where it lives.** Contracts only hold values both sides read, directly or through a contract schema:

| Read by | Goes in | Example |
|---|---|---|
| Only the backend | the backend module's `constants/` (Hono JS 1.7) | a seeded row id (`CHAT_BOT_MAIN_AGENT_ID`), a mount path (`CHAT_BOT_TOOLS_PATH`), a poll interval |
| Only the frontend | the frontend module's `constants/` (React 1.1) | an animation duration, a UI-only page size |
| Both | `{family}/constants.ts` here | a length limit (`CHAT_BOT_THREAD_TITLE_MAX`), a pattern (`CHAT_BOT_LOOKUP_ID_PATTERN`), a default (`CHAT_BOT_DEFAULT_TRIGGER`) |

A value both sides need can't live in one app, because apps don't import each other. Two copies (one per app) drift: the frontend allows a 150-character title, and the backend still rejects anything over 120.

```ts
// reports/constants.ts
// -----
// Reports
// -----
export const REPORT_TITLE_MAX = 120;
export const REPORT_DEFAULT_FORMAT = "pdf";

// -----
// Lookup ids are lowercase slugs, e.g. "weekly".
// -----
export const REPORT_LOOKUP_ID_PATTERN = /^[a-z][a-z0-9_]*$/;
```

---

## 3. Contracts: Schema design

**3.1 `[House]` Every export is a schema and its inferred type.** Export a pair: `export const XSchema = z.object(...)` and `export type X = z.infer<typeof XSchema>`. Don't write TypeScript types by hand: a hand-written type has no runtime check, so a consumer can't parse data with it.

- **Exception:** constants in `{family}/constants.ts` (2.5) and `*_VALUES` arrays in `enums.ts` (§4) are plain values, not schema pairs.

**3.2 `[House]` Names follow the same table as the apps.**

| Shape | Name | Example |
|---|---|---|
| An entity as the API returns it | `{Entity}Schema` | `ProjectSchema` |
| One row of a list response | `{Entity}ListItemSchema` | `ProjectListItemSchema` |
| A request body | `{Verb}{Entity}BodySchema` | `CreateProjectBodySchema` |
| Query params | `{Entity}QuerySchema` | `ProjectHistoryQuerySchema` |
| Enum values | `{THING}_VALUES` + type `{Thing}Value` | `PROJECT_STATUS_VALUES`, `ProjectStatusValue` |

The Hono JS scope (§3.2) uses the same `Body` / `Query` suffixes, so a contract schema drops straight into `zValidator`.

**3.3 `[House]` Put the validation both sides need in the contract.** Rules like `.uuid()`, `.trim().min(1)` and `.int().min(1)` belong in the contract, so the frontend form and the backend validator reject the same input. App-only additions stay in the app and extend the contract. For example, the backend adds `userId` from the session with `.extend({ userId })`, and never puts it in the contract.

**3.4 `[House]` Dates travel as ISO strings.** Write every timestamp as:

```ts
createdAt: z.coerce.date().transform((d) => d.toISOString()),
```

The same schema then works on both sides. The backend parses an ORM row whose `createdAt` is a `Date`, and the frontend parses JSON whose `createdAt` is a string. Both come out as an ISO string. Never use `z.date()` in a contract: it rejects the string the frontend receives.

**3.5 `[House]` No `z.any()`.** Use `z.unknown()` for an opaque blob, or better, a real schema. `z.any()` switches off type checking in every app that imports the type.

**3.6 `[House]` Contracts describe the wire, not the database.** A schema that parses a raw DB row lives in the app, next to the query that uses it. That covers `Date` objects and enum values read from database enums.
- Name it `{Entity}RowSchema`.
- Never reuse a contract's name for it. Two different `ProjectSchema`s in one codebase get imported by mistake.

**3.7 `[House]` Apps import contract schemas; they don't retype them.** If a contract exists for a shape, import it or build on it (`.extend()`, `.pick()`, `.array()`), and wrap it in the app's response envelope. Don't copy its fields or its enum values into an app schema. A copy doesn't change when the contract does, so the two drift apart without any error.

**3.8 `[House]` In a schema file, schemas go at the top and types at the bottom.** This holds for every schema file in every scope: contracts, a module's `schemas/`, `src/schemas/`, a shared package's `schemas/`, and an agent tool's `schema.ts`. Declare every schema first, in the order they build on each other, then every `z.infer` type in one block after the last schema. Don't put a type between two schemas.

```ts
// before: types interleaved with schemas
export const AddFourNumbersInputSchema = z.strictObject(addFourNumbersFields);
export type AddFourNumbersInput = z.infer<typeof AddFourNumbersInputSchema>;
export const AddFourNumbersResultSchema = z.object({ ...addFourNumbersFields, sum: z.number() });
export type AddFourNumbersResult = z.infer<typeof AddFourNumbersResultSchema>;

// after: schemas first, types last
export const AddFourNumbersInputSchema = z.strictObject(addFourNumbersFields);
export const AddFourNumbersResultSchema = z.object({ ...addFourNumbersFields, sum: z.number() });

export type AddFourNumbersInput = z.infer<typeof AddFourNumbersInputSchema>;
export type AddFourNumbersResult = z.infer<typeof AddFourNumbersResultSchema>;
```

---

## 4. Contracts: Enums and the database

**4.1 `[House]` Every enum that is also a database enum exists twice. Change both in the same PR.** The database package defines its enums (for example Drizzle `pgEnum`) with the values typed out, and doesn't import contracts. So each `*_VALUES` array has a twin:

| Contract (`{family}/enums.ts`) | Database (schema file) |
|---|---|
| `PROJECT_STATUS_VALUES` | `projectStatusEnum` |

Keep a table like this one, listing every pair, in the contracts package README.

Adding a value means three changes in one PR:
1. The contract array.
2. The database enum.
3. A migration.

A reviewer checks that the two lists match exactly.

---

## 5. Contracts: Changing a contract

**5.1 `[House]` A contract change is a change to every consumer.** Before opening the PR, typecheck every workspace that imports the subpath you changed. A green build in one app proves nothing about the others.

**5.2 `[House]` Ship in an order that never breaks the live pair.** The backend and the frontends deploy separately, so for a while an old frontend talks to a new backend, or the reverse. Order the change so both versions keep working:

| Change | Order |
|---|---|
| Add a response field | Add it to the contract as `.optional()`, then deploy the backend first. The frontend starts reading it later. |
| Remove or rename a response field | Stop reading it in the frontend and deploy that first. Then remove it from the backend and the contract. |
| Add an enum value | Deploy the frontend first. An old frontend's `z.enum` parse rejects the **whole response** when it meets a value it doesn't know. Only then let the backend send the new value. |
| Tighten request validation | Deploy the frontend (form) first, so it stops sending input the backend will reject. |

**5.3 `[House]` Say which rows of 5.2 apply.** A PR that changes the contracts package names the change type and the deploy order in its description.

---

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

---

# Effect

**Covers:** any file that builds or runs an `Effect`, and the shared file that holds the shared error tags and the runner (§3, §4).

**Doesn't cover:** code that doesn't import `effect`. Plain `async` code follows the rules of its own scope.

**Packages:**
- `effect`: the library. Examples use Effect 3. Effect 4 renames some APIs (for example `Effect.catchAll` → `Effect.catch`, `Effect.either` → `Effect.result`), so check the v4 docs (under `/docs/v4/`) before copying an example into a v4 codebase.

| # | Section |
|---|---|
| 1 | [Effect: Where Effect runs](#1-effect-where-effect-runs) |
| 2 | [Effect: Writing effects](#2-effect-writing-effects) |
| 3 | [Effect: Errors](#3-effect-errors) |
| 4 | [Effect: Running effects](#4-effect-running-effects) |
| 5 | [Effect: Tests](#5-effect-tests) |
| 6 | [Effect: Layers in a Hono app](#6-effect-layers-in-a-hono-app) |

---

## 1. Effect: Where Effect runs

**1.1 `[Effect docs]` Run effects once, at the entry point.** Write the program's logic as effects and call `Effect.run*` once per unit of work: in the request handler, the queue consumer, the cron job, the script's `main` ([docs](https://effect.website/docs/getting-started/running-effects/)). Services and queries return `Effect`s, and the code above them composes with `yield*`. That keeps three things working across the whole call:

- **Typed errors.** The handler sees `NotFound | Conflict | DbError`, not an opaque rejected `Promise`.
- **Composition.** One `Effect.retry`, `Effect.timeout` or span can wrap a service that makes three queries.
- **Interruption.** When the request is cancelled, queries that haven't started yet don't start.

Never call `run*` inside an effect.

- **A Promise-based library's callback is an entry point too.** When a library awaits a function you hand it (a stream adapter's `append`, an `onComplete` hook), that function runs one effect through the shared runner (§4.1). It runs later, outside the effect that built it, so it isn't a `run*` inside an effect.

**1.2 `[House]` While adopting Effect, wrap only at the frontier, and move the frontier up.** A codebase moving to Effect one layer at a time has a frontier: the highest layer that is already Effect. Only that layer exports `Promise` wrappers, named for the effect without the suffix (`findUser` for `findUserEffect`), and each wrapper calls the shared runner (§4.1).

```ts
// queries/ is Effect; services/ is not yet. queries/ is the frontier.
export const findUserEffect = (db: Db, id: string): Effect.Effect<User, NotFound | DbError> => …;
export const findUser = (db: Db, id: string): Promise<User> => runEffect(findUserEffect(db, id));
```

- Below the frontier, never wrap. An Effect service calls `yield* findUserEffect(...)`, not `await findUser(...)`.
- When you convert the layer above to Effect, delete the old frontier's wrappers in the same PR. The run point moves up to the new frontier.
- The goal is one run per entry point (1.1). Wrappers are a migration cost, not the design.

---

## 2. Effect: Writing effects

**2.1 `[Effect docs]` Write sequential logic with `Effect.gen` and `yield*`** ([docs](https://effect.website/docs/getting-started/using-generators/)). Use `pipe` for short transforms on one effect (`Effect.map`, `Effect.mapError`, `Effect.retry`). Don't nest `flatMap` chains where a generator reads top to bottom.

**2.2 `[Effect docs]` Wrap every promise with `Effect.tryPromise` and always pass `catch`.** Without `catch`, a rejection becomes an `UnknownException`, and the error type says nothing about what failed ([docs](https://effect.website/docs/getting-started/creating-effects/)). Use `Effect.promise` only for a promise that can't reject. If it does reject anyway, that's a defect.

```ts
const rows = yield* Effect.tryPromise({
  try: () => db.query("select * from users where id = $1", [id]),
  catch: (cause) => new DbError({ cause }),
});
```

**2.3 `[Effect docs]` Never `throw` inside an effect.** A `throw` inside `Effect.gen` or `Effect.sync` doesn't become a typed error. It becomes a defect, which no `catchTag` can see ([docs](https://effect.website/docs/error-management/unexpected-errors/)). Wrap throwing sync code (`JSON.parse`, a schema's `.parse`) in `Effect.try({ try, catch })`, and fail on purpose with `return yield* new Tag(...)` (3.4).

**2.4 `[House]` Who owns the data decides what a parse failure is.**

| Data | Example | A parse failure is | Do this |
|---|---|---|---|
| From outside the program | A third-party API response, a webhook body, a queue message | Expected: someone else sent bad data | `Effect.try` with `catch: (cause) => new ParseError({ cause })` |
| Your own, already typed | A row from your database through a typed query | A bug: schema and table have drifted | Don't re-validate it. If you parse it to reshape it (for example dates to ISO strings), end with `Effect.orDie` |

A drifted schema is a deploy mistake, not something a caller can handle. Typing it as `ParseError` pushes a branch nobody can act on into every caller's error type. As a defect, it still fails the request, and the runner logs it with the full cause (4.1).

```ts
const user = yield* Effect.try(() => UserSchema.parse(row)).pipe(Effect.orDie);
```

**2.5 `[House]` One wrapped call, one kind of failure.** Each `tryPromise` / `try` block wraps one kind of operation, so its `catch` can name the one tag that fits. Don't parse inside a database call's `try`: a parse bug comes out tagged `DbError`, and the reader goes looking for a database problem that doesn't exist. Inside a transaction callback, return raw rows and parse after the transaction resolves.

**2.6 `[House]` Exported effects declare their type; private helpers infer it.** An exported effect writes `Effect.Effect<A, E>` with each error listed (`NotFound | DbError`), never a wide base class or `unknown`. It's the module's contract, and a declared type turns an accidental new error into a compile error at the definition instead of somewhere in a caller. Private helpers let TypeScript infer.

- TypeScript accepts a declared error that can never happen. A reviewer checks that every listed error has a source in the body: a `catch`, a `yield* new …`, or a `yield*` of an effect that can fail with it.

**2.7 `[Effect docs]` `Effect.all` runs one at a time unless you say otherwise.** Pass `{ concurrency: n }` or `{ concurrency: "unbounded" }` when the effects are independent, and leave it off on purpose when order matters ([docs](https://effect.website/docs/concurrency/basic-concurrency/)).

**2.8 `[Effect docs]` Retry and time out with the built-ins, and retry only failures that can recover.** Use `Effect.retry` with a `Schedule` and `Effect.timeout`, not a hand-written loop ([retrying](https://effect.website/docs/error-management/retrying/), [timing out](https://effect.website/docs/error-management/timing-out/)). Filter by tag, so a `NotFound` isn't retried three times:

```ts
findUserEffect(db, id).pipe(
  Effect.retry({
    schedule: Schedule.exponential("100 millis"),
    times: 3,
    while: (e) => e._tag === "DbError",
  }),
);
```

---

## 3. Effect: Errors

**3.1 `[Effect docs]` Every expected error is a tagged class.** Define it with `Data.TaggedError("Name")`; the class name and the tag are the same string ([docs](https://effect.website/docs/error-management/yieldable-errors/)). That includes domain outcomes such as "not found", not only infrastructure failures. A plain `Error` subclass in the error channel has no `_tag`, so `catchTag` can't select it and the boundary falls back to `instanceof`.

**3.2 `[House]` The shared file defines a small, fixed error vocabulary.** It has two groups, and nothing module-specific:

| Group | Tags | Carries | Becomes |
|---|---|---|---|
| Domain | `NotFound`, `Conflict`, `Forbidden`, `Invalid` | `message`: written for the end user | The matching 4xx |
| Infrastructure | `DbError`, `ExternalError`, `ParseError` | `cause`: the original error | 5xx (`ParseError` and `ExternalError`: 502) |

```ts
export class NotFound extends Data.TaggedError("NotFound")<{ message: string }> {}
export class Conflict extends Data.TaggedError("Conflict")<{ message: string }> {}
export class DbError extends Data.TaggedError("DbError")<{ cause: unknown }> {}

export type AppFailure = NotFound | Conflict | Forbidden | Invalid | DbError | ExternalError | ParseError;
```

- Modules import these tags. They never define their own `DbError`: two classes with the same tag look identical to `catchTag` but not to `instanceof`, and each copy drifts.
- A new tag joins the shared file only when it needs different handling at the boundary (a new status code, a new log level). Adding it breaks the exhaustive `switch` in 4.2 until the mapping exists, which is the point.

**3.3 `[House]` A module-specific tag must earn its place, and stays inside the module.** Add one (`InsufficientFunds`) only when code in the module catches it by tag: a fallback, a retry, a different branch. Before the effect leaves the module, `mapError` it to a shared tag. The runner only accepts `Effect<A, AppFailure>` (4.1), so an unmapped local tag fails to compile at the run point.

```ts
export const chargeEffect = (…): Effect.Effect<Receipt, Conflict | DbError> =>
  chargeInternal(…).pipe(
    Effect.catchTag("InsufficientFunds", (e) => Effect.fail(new Conflict({ message: e.message }))),
  );
```

**3.4 `[Effect docs]` Fail with `return yield* new Tag(...)`.** Tagged errors can be yielded directly in a generator. The `return` tells TypeScript the code after it can't run.

```ts
if (rows.length === 0) return yield* new NotFound({ message: "User not found" });
```

**3.5 `[Effect docs]` Handle errors by tag.** Use `Effect.catchTag` / `Effect.catchTags` to recover from specific errors, and `Effect.mapError` to translate them ([expected errors](https://effect.website/docs/error-management/expected-errors/), [error channel operations](https://effect.website/docs/error-management/error-channel-operations/)). Avoid `catchAll` (`catch` in v4) in the middle of a program: it sends every tag down one path, and an error added later is swallowed without a compile error.

**3.6 `[Effect docs]` Expected errors are typed; bugs are defects.** A failure a caller or user can cause goes in the error channel. A broken invariant (drifted schema, a row that must exist, config that must parse at startup) uses `Effect.orDie`, which removes it from the type and terminates the fiber ([docs](https://effect.website/docs/error-management/two-error-types/)). Never use `orDie` to hide a failure a user can trigger.

**3.7 `[House]` Let a database constraint do the check, and map its error code to a domain tag.** A read followed by a write ("already a member? if not, insert") races with a concurrent request. Write directly, and turn the violation into a domain error in the `catch` (Postgres: `23505` unique → `Conflict`, `23503` foreign key → `NotFound`). Drivers often nest the original error, so walk `cause` to find the code. A read before the write is fine for a friendlier message, but the constraint is the real guard.

```ts
catch: (cause) =>
  pgCode(cause) === "23505" ? new Conflict({ message: "Already a member" }) : new DbError({ cause }),
```

**3.8 `[House]` Keep the cause.** Every infrastructure error stores the original as `cause`, all the way to the boundary. Never replace it with `String(error)` or a new message alone.

---

## 4. Effect: Running effects

**4.1 `[House]` One shared runner turns an `Exit` into a `Promise`.** It uses `Effect.runPromiseExit`, which returns success or failure as data instead of rejecting ([running effects](https://effect.website/docs/getting-started/running-effects/), [Exit](https://effect.website/docs/data-types/exit/)). It accepts only `AppFailure` errors (3.2), then:

1. Returns the value on success.
2. Passes an expected failure to `toAppError` (4.2).
3. Logs anything else (a defect, an interruption) with `Cause.pretty`, then throws an internal error with the cause attached.

```ts
export async function runEffect<A>(effect: Effect.Effect<A, AppFailure>): Promise<A> {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) return exit.value;

  const failure = Cause.failureOption(exit.cause);
  if (Option.isSome(failure)) throw toAppError(failure.value);

  console.error(Cause.pretty(exit.cause));
  throw new InternalError("Unexpected failure", { cause: Cause.squash(exit.cause) });
}
```

**4.2 `[House]` Map tags to the app's errors in one exhaustive `switch`.** `toAppError` has one case per `AppFailure` tag and no `default`, so TypeScript fails the build when a tag has no case. Domain tags become the matching client error and pass their `message` through. Infrastructure tags become an internal error that keeps the `cause`.

**4.3 `[Effect docs]` Log the whole `Cause`, not one squashed error.** `Cause.squash` keeps one error and drops the rest: parallel failures, finalizer errors, the interruption trail. Log with `Cause.pretty` before squashing ([docs](https://effect.website/docs/data-types/cause/)).

**4.4 `[House]` A 5xx is logged once, and the client never sees why.** Whatever turns a failure into a 5xx logs its cause: the runner for defects, the app's top-level error handler for infrastructure tags. The response body carries a fixed message such as `"Internal server error"`, never a tag name, an internal label or a driver message. A 4xx carries the domain tag's user-facing `message` and isn't logged as an error.

---

## 5. Effect: Tests

**5.1 `[House]` Test the effect, not the wrapper.** The logic lives in the effect: the guards, the constraint mapping, the tags. Run it against a stub dependency and assert on the tag. A test that mocks the effect layer and checks that a wrapper passes values through proves nothing about error handling.

```ts
const error = await Effect.runPromise(Effect.flip(findUserEffect(stubDb([]), "u-1")));
expect(error._tag).toBe("NotFound");
```

**5.2 `[House]` Pass dependencies in, so tests need no module mocking.** Take the database client (or any I/O) as an argument, or provide it as an Effect service when many effects share it ([docs](https://effect.website/docs/requirements-management/services/)). A stub then replaces it directly.

**5.3 `[House]` Cover each failure at least once.** For every tag an effect declares, one test makes it fail that way: a stub that rejects (`DbError`), an empty result (`NotFound`), a constraint error code (`Conflict`). For a defect (2.4), assert the `Exit` is a die with `Cause.isDie`.

---

## 6. Effect: Layers in a Hono app

In a Hono backend that uses Effect, the core is Effect and the shell is plain async TypeScript. For example, `item-svc.ts` returns `Effect<Item, DbError | NotFound>`, and the route calls `await runEffect(addItemSvc(...))` once.

**6.1 `[House]` `queries/` and `handlers/` are Effect only; the route runs the effect once.** A query or service returns an `Effect` and never a `Promise`. The route handler (Hono JS 2.2) is the entry point: it makes one `runEffect(...)` call and returns the envelope. Neither `queries/` nor `handlers/` calls `runEffect`.

**6.2 `[House]` Exported `…Svc` and `…Effect` functions declare `Effect.Effect<A, E>`.** This is Effect 2.6 applied to this app: a service is named `{verb}{Thing}Svc` and a query `{verb}{Thing}Effect`, and each one lists its errors in the type. A pass-through service still declares the type, so a new error added to the query shows up as a compile error at the service.

**6.3 `[House]` Effects run in three places, through `runEffect`.**
- A route handler.
- Middleware (`lib/`).
- A callback that a Promise-based library awaits. The chat-bot stream producer is one (Effect 1.1).

Never call `Effect.run*` anywhere else. `runEffect` maps typed failures to `AppError` and logs defects (Effect 4.1). **Listed exceptions:** the two chat-bot tool runners (`chat-bot-server-tool.ts`, `chat-bot-mcp-tool.ts`) call `Effect.runPromiseExit` because they need the raw `Exit` to answer the model with `{ error }` (Agents 3.4). Any new exception is added to the lint config with a reason.

**6.4 `[House]` Promise work enters through `Effect.tryPromise({ try, catch })`.** `async` appears in `queries/` and `handlers/` only as the `try` callback, a database `transaction` callback, or a helper whose first parameter is `tx` (Effect 2.2, 2.5). The `catch` names the failure, for example `new DbError({ cause })`.

**6.5 `[House]` Lint enforces this.** The rules live in `tools/oxlint/anti-slop/effect/`:

| Rule | Standard |
|---|---|
| `no-effect-run-outside-runner` | 6.3, Effect 4.1 |
| `no-run-effect-in-effect-layers` | 6.1 |
| `no-async-in-effect-layers` | 6.4 |
| `require-effect-return-type` | 6.2, Effect 2.6 |
| `require-try-promise-catch` | Effect 2.2 |
| `no-throw-in-effect-gen` | Effect 2.3 |
| `no-effect-catch-all` | Effect 3.5 |

---

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
