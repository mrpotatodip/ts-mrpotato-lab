---
name: hono
description: Hono API development patterns — route grouping, Zod validation, RPC client, error handling, middleware
---

# Hono — API Development

Use Hono v4+ for API server development with Node.js runtime, Zod validation, and RPC client for end-to-end type safety.

## Project structure

```
apps/api/
├── src/
│   ├── index.ts              # App entry — middleware, route mounting, serve()
│   ├── modules/
│   │   ├── reconciliations/
│   │   │   └── index.ts      # Feature route group
│   │   ├── runs/
│   │   │   └── index.ts      # Another route group
│   │   └── issues/
│   │       └── index.ts
│   └── lib/
│       ├── reconciliation-engine/  # Pure domain logic (not Hono)
│       └── misc/                   # Shared utilities
└── package.json
```

## App setup

```ts
// src/index.ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import reconciliations from "./modules/reconciliations";
import runs from "./modules/runs";

const app = new Hono();

// Middleware order: security → logging → CORS → routes
app.use("*", logger());
app.use("*", cors({
  origin: process.env.CORS_ORIGIN || "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Mount feature routes
const routes = app
  .route("/reconciliations", reconciliations)
  .route("/api/reconciliation/runs", runs);

serve({ fetch: app.fetch, port: 8787 });

// Export for RPC client consumption
export type AppType = typeof routes;
```

## Route grouping (required pattern)

Always group routes by domain into separate `new Hono()` instances. Chain handlers with `.get().post().patch()`. Never define all routes in `index.ts`.

```ts
// src/modules/runs/index.ts
import { Hono } from "hono";
import { db, reconciliationRuns, eq, desc } from "@repo/db";

const app = new Hono()
  .get("/", async (c) => {
    const runs = await db.select().from(reconciliationRuns)
      .orderBy(desc(reconciliationRuns.startedAt));
    return c.json({ runs });
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const [run] = await db.select().from(reconciliationRuns)
      .where(eq(reconciliationRuns.id, id));
    if (!run) return c.json({ error: "Not found" }, 404);
    return c.json({ run });
  })
  .get("/:id/details", async (c) => {
    const id = c.req.param("id");
    const details = await fetchRunDetails(id);
    return c.json(details);
  });

export default app;
```

Mount it in `index.ts`:

```ts
import runs from "./modules/runs";
app.route("/api/reconciliation/runs", runs);
```

## Zod validation (always use)

```ts
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

// Extract schemas to module-level
const patchIssueSchema = z.object({
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "IGNORED"]),
  resolutionNotes: z.string().max(500).optional().nullable(),
});

const issuesRoute = new Hono()
  .patch("/:id", zValidator("json", patchIssueSchema), async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");  // typed from schema

    const [updated] = await db.update(reconciliationIssues)
      .set({ status: body.status, resolutionNotes: body.resolutionNotes })
      .where(eq(reconciliationIssues.id, id))
      .returning();

    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json({ issue: updated });
  });
```

### Zod + Hono rules

- Always extract schemas to module-level `const` — never inline.
- `zValidator("json", schema)` for POST/PATCH/PUT bodies.
- `zValidator("query", schema)` for query params. 
- `zValidator("param", schema)` for URL params.
- Access validated data via `c.req.valid("json")` — it's already typed.

## Response patterns

```ts
// Success
return c.json({ data: result });                    // 200
return c.json({ data: created }, 201);              // 201

// Errors — always return an error message
return c.json({ error: "Not found" }, 404);
return c.json({ error: "Validation failed", details: errors }, 422);
return c.json({ error: err.message }, 500);
```

**Rules:**
- Always wrap success responses in `{ data: ... }` for consistency.
- Always wrap error responses in `{ error: "message" }`.
- Never expose raw stack traces — catch errors and return `err.message`.
- Use appropriate status codes: 200 (GET), 201 (POST), 200/201 (PUT), 200 (PATCH), 204 (DELETE).

## RPC client (end-to-end type safety)

Export `AppType` from the entry point so the frontend consumes typed routes:

```ts
// apps/api/src/index.ts
const routes = app.route("/reconciliations", reconciliations)
                   .route("/api/reconciliation/runs", runs);
export type AppType = typeof routes;
```

```ts
// apps/web/src/utils/api.ts
import { hc } from "hono/client";
import type { AppType } from "../../../api/src/index";

export const client = hc<AppType>("http://localhost:3001");
```

Then in components, all routes, params, query, and response types are inferred:

```ts
const res = await client.api.reconciliation.runs.$get();
const data = await res.json();  // typed

const detail = await client.api.reconciliation.runs[':id'].details.$get({
  param: { id: runId },
});

const update = await client.api.reconciliation.issues[':id'].$patch({
  param: { id: issueId },
  json: { status: "RESOLVED", resolutionNotes: "Fixed" },
});
```

## Middleware patterns

```ts
// Built-in
app.use("*", cors());
app.use("*", logger());

// Custom auth middleware
app.use("/api/*", async (c, next) => {
  const token = c.req.header("Authorization");
  if (!isValid(token)) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId", decodeToken(token).sub);
  await next();
});

// Read context set by middleware
app.get("/me", (c) => {
  const userId = c.get("userId");  // typed via middleware
  return c.json({ userId });
});
```

## Error handling

```ts
// Global error handler (catches uncaught errors)
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

// 404 handler (always last)
app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});
```

## Environment variables / context

```ts
// Bind typed env when creating the app
type Env = {
  Bindings: {
    DATABASE_URL: string;
    API_KEY: string;
  };
};

const app = new Hono<Env>();

// Access in handlers
app.get("/", (c) => {
  const dbUrl = c.env.DATABASE_URL;
});
```

## Testing (when possible)

Hono has a built-in test client (`hono/testing`):

```ts
import { testClient } from "hono/testing";
import app from "./index";

const client = testClient(app);
const res = await client.api.reconciliation.runs.$get();
expect(res.status).toBe(200);
```

## Anti-patterns

- Don't define route handlers in `index.ts` — extract to `modules/<domain>/`.
- Don't validate manually in handlers — use `zValidator` middleware.
- Don't use `c.req.json()` with `try/catch` for validation — Zod handles that.
- Don't return raw objects — always wrap in `{ data }` or `{ error }`.
- Don't expose database errors directly to clients — catch and return a sanitized message.
- Don't mix REST route definitions — one route group = one `new Hono()` instance per domain.
- Don't import `AppType` from nested route files — only from the entry `index.ts` where routes are mounted.
