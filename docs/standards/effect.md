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
