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
