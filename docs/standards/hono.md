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
