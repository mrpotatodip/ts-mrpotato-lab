---
name: tanstack
description: TanStack libraries — Query, Router, Start, Form with Zod, DB, Hotkey patterns
---

# TanStack Libraries

Use TanStack libraries for data fetching, routing, forms, and keyboard shortcuts. Prefer TanStack patterns over raw React state management.

## TanStack Query (v5)

### Query setup

```ts
// router.tsx — single QueryClient with global defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,     // 5 min before refetch
      retry: 1,                       // don't retry endlessly
    },
    mutations: {
      onError: (err) => console.error(err),
    },
  },
});
```

### Query factories (required pattern)

Always define queries via factories — never inline `queryKey` and `queryFn` in components.

```ts
// src/queries/runs.ts
import { queryOptions } from '@tanstack/react-query';
import { client } from '../utils/api';

export const runQueries = {
  all: () => queryOptions({
    queryKey: ['runs'],
    queryFn: () => client.api.reconciliation.runs.$get().then(r => r.json()),
    staleTime: 1000 * 60 * 5,
  }),

  detail: (runId: string) => queryOptions({
    queryKey: ['runDetails', runId],
    queryFn: () => client.api.reconciliation.runs[':id'].details.$get({
      param: { id: runId },
    }).then(r => r.json()),
    enabled: !!runId,
  }),

  results: (runId: string) => queryOptions({
    queryKey: ['runDetails', runId, 'results'],
    queryFn: () => client.api.reconciliation.results.$get({
      query: { runId },
    }).then(r => r.json()),
    enabled: !!runId,
  }),
};
```

Then in components, just spread:

```ts
const { data, isLoading, isError } = useQuery(runQueries.all());
const { data: details } = useQuery(runQueries.detail(selectedRunId));
```

### Query key convention

```ts
// Domain-first, specificity increases left to right
['runs']                              // all runs (list)
['runDetails', runId]                 // single run detail
['runDetails', runId, 'results']      // nested sub-resource
```

### Fetching data (inline — only when factory is overkill for a one-off)

```ts
const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['runDetails', selectedRunId],
  queryFn: () => fetchRunDetails(selectedRunId),
  enabled: !!selectedRunId,
});

// Always check loading/error before accessing data
if (isLoading) return <Skeleton />;
if (isError) return <Error message={error.message} />;
```

### Mutations

```ts
const mutation = useMutation({
  mutationFn: ({ id, status }) => updateIssue(id, status),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['runDetails'] }); // re-fetch dependent queries
    toast.success('Updated');
  },
  onError: (err) => toast.error(err.message),
});

// Call with: mutation.mutate({ id: 'x', status: 'RESOLVED' })
// Track state: mutation.isPending, mutation.isError
```

### Invalidation patterns

```ts
queryClient.invalidateQueries({ queryKey: ['runs'] });           // exact
queryClient.invalidateQueries({ queryKey: ['runDetails'] });     // all runDetails regardless of id
queryClient.refetchQueries({ queryKey: ['runs'] });              // force immediate
```

### Anti-patterns

- Don't put `useQuery` in a `useEffect` — `enabled` flag handles conditional fetching.
- Don't call `refetch()` after a mutation — use `invalidateQueries`.
- Don't spread entire API responses into state — let Query cache be the state.

## TanStack Router (v1)

### File-based routing

Routes live in `src/routes/` and use `createFileRoute`:

```ts
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});
```

### Root route with context

```ts
// src/routes/__root.tsx
import { createRootRouteWithContext } from '@tanstack/react-router';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  shellComponent: RootDocument,  // wraps all pages in <html>/<body>
});
```

### Router setup

```ts
// src/router.tsx
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';  // auto-generated

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreload: 'intent',          // preload on hover/focus
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

### Navigation

```ts
import { Link, useNavigate } from '@tanstack/react-router';

<Link to="/about">About</Link>
<Link to="/issues/$id" params={{ id: issue.id }}>View</Link>

const navigate = useNavigate();
navigate({ to: '/about' });
```

### Route params

```ts
// src/routes/issues/$id.tsx
export const Route = createFileRoute('/issues/$id')({
  component: ({ params }) => {
    const { id } = params;  // typed
  },
});
```

### Anti-patterns

- Don't manually edit `routeTree.gen.ts` — it's generated.
- Don't pass state via URL when Query cache is available — prefer `queryKey` invalidation.

## TanStack Start (v1)

SSR framework wrapping Router + Query. Entry via `vite.config.ts`:

```ts
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
export default defineConfig({
  plugins: [tanstackStart()],
});
```

Start handles SSR rendering, head tags, and script injection automatically through the root route's `head()` export and `<Scripts />` component.

## TanStack Form

**Zod is the standard validation library.** Always define a Zod schema for every form — never hand-write validation logic.

### Basic form

```ts
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

const formSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

type FormValues = z.infer<typeof formSchema>;

const form = useForm({
  defaultValues: { email: '', name: '' } as FormValues,
  validators: {
    onChange: formSchema,
  },
  onSubmit: ({ value }) => mutation.mutate(value),
});
```

### Field-level Zod schemas

For forms where fields validate independently:

```ts
const form = useForm({
  defaultValues: { email: '', name: '' },
  onSubmit: ({ value }) => mutation.mutate(value),
});

<form.Field
  name="email"
  validators={{ onChange: z.string().email() }}
>
  {(field) => (
    <>
      <input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {field.state.meta.errors.map(e => <span key={e}>{e}</span>)}
    </>
  )}
</form.Field>
```

### Schema with refine/superRefine

```ts
const formSchema = z.object({
  password: z.string().min(8),
  confirm: z.string(),
}).superRefine(({ password, confirm }, ctx) => {
  if (password !== confirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['confirm'],
    });
  }
});
```

### Form rules

- **Zod is mandatory.** Never use inline functions, Yup, or hand-written validation.
- Derive types with `z.infer<typeof schema>` — never duplicate type definitions.
- Derive field errors from `field.state.meta.errors` — never manage error state manually.
- Use `onChange` validation for real-time feedback, `onBlur` for less aggressive checking.
- For multi-field cross-validation, use `.superRefine()` on the Zod schema.
- Extract schemas to module-level consts — never define them inside components.

## TanStack Table (v8)

### Column definition pattern

Columns defined as `ColumnDef<Details>[]`:

```ts
import type { ColumnDef, PaginationState, OnChangeFn } from "@tanstack/react-table";

const columns: ColumnDef<ResourceDetails>[] = [
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() as string}</span>,
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    cell: ({ getValue }) => {
      const status = getValue() as ResourceStatus;
      return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>{status}</span>;
    },
  },
  {
    id: "link",
    header: "",
    cell: ({ row }) => (
      <Link to="/resources/$id" params={{ id: row.original.id }} className="font-mono text-xs hover:underline">
        {truncateId(row.original.id)}
      </Link>
    ),
  },
];
```

- `id` — always a string, matches the header
- `accessorKey` — for simple cell access from `getValue()`
- `cell` — for complex rendering; access via `getValue()` for `accessorKey` fields or `row.original` for cross-column data
- Link columns use `to="/module/$id"` pattern with `params={{ id }}`

### Manual pagination (server-side data)

```tsx
const [pagination, setPagination] = useState<PaginationState>({
  pageIndex: page,
  pageSize: limit,
});

function handlePaginationChange(updater: OnChangeFn<PaginationState>) {
  const next = typeof updater === "function" ? updater(pagination) : updater;
  setPagination(next);
  navigate({
    search: (prev) => ({ ...prev, page: next.pageIndex, limit: next.pageSize }),
  });
}

<DataTable
  columns={columns}
  data={items}
  title="Resources"
  pageSize={pagination.pageSize}
  pageCount={Math.ceil(total / pagination.pageSize)}
  pagination={pagination}
  onPaginationChange={handlePaginationChange}
/>
```

Pagination state is synced to URL search params. When filters change, reset to page 0.

## TanStack DB (when needed)

If you need client-side collections with querying:

```ts
import { createCollection } from '@tanstack/react-db';

const issues = createCollection<Issue>(data, {
  indexes: {
    byStatus: (issue) => issue.status,
    bySeverity: (issue) => issue.severity,
  },
});

// Query
issues.query({ filter: { status: 'OPEN' } });
issues.query({ sort: 'detectedAt', direction: 'desc' });
issues.query({ limit: 20, offset: 0 });

// Mutate
issues.insert(newIssue);
issues.update(issueId, { status: 'RESOLVED' });
issues.delete(issueId);
```

Use TanStack DB only when you need client-side filtering/sorting of local data that won't be fetched from a server. Don't use it as a replacement for server-side state — Query handles that.

## TanStack Hotkey (when needed)

```ts
import { useHotkeys } from '@tanstack/react-hotkey';

useHotkeys({
  keys: {
    'ctrl+s': () => handleSave(),
    'escape': () => closeModal(),
    'ctrl+k': () => openSearch(),
  },
  scoped: 'dialog',              // only fires when dialog is focused
  enabled: isModalOpen,
});

// Or declarative:
<Hotkeys keys={{ 'ctrl+enter': submit }} scoped="form" />
```

### Hotkey rules

- Always set `scoped` — never register global hotkeys unless absolutely necessary.
- Use `enabled` to disable when the target isn't visible.
- Prefer modifier+letter combos over single keys to avoid accidental triggers.

## General TanStack rules

- **Query** for server state, **Form** for user input, **Router** for navigation, **DB** for client-side collections, **Hotkey** for keyboard shortcuts. Don't mix responsibilities.
- Always use TypeScript generics — TanStack libraries are built for type inference.
- Devtools: use `@tanstack/react-devtools` and `@tanstack/react-router-devtools` in development only.
