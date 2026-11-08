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

**7.6 `[House]` Change a page's layout or flow, change its pattern in `DESIGN.md` in the same PR.** The "Patterns in use" bullet for that page says what a person sees and does there; a PR that moves a control, adds a route or changes a list's shape edits that bullet.

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
