---
name: zod
description: Zod schema validation — type inference, Hono integration, refine/superRefine patterns
---

# Zod — Schema Validation

Use Zod v3.23+ for runtime schema validation and TypeScript type inference.

## Core rules

- **Derive types, don't duplicate.** Use `z.infer<typeof schema>` — never write types manually when a schema exists.
- **Validate at boundaries.** Validate external input (API payloads, env vars, config files, CSV rows). Don't validate internal function calls.
- **Prefer `z.object()` over `.passthrough()` or `.catchall()`** unless you explicitly need to preserve unknown keys.

## Schema patterns

```ts
// Simple object
const CreateUser = z.object({
  email: z.string().email(),
  age: z.number().int().positive().max(150),
});

// Enum from array
const STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "IGNORED"] as const;
const IssueStatus = z.enum(STATUSES);
type IssueStatus = z.infer<typeof IssueStatus>;

// Optional + nullable
z.string().optional()        // string | undefined
z.string().nullable()        // string | null
z.string().optional().nullable() // string | null | undefined

// Defaults (on parse, not schema — use .default() sparingly)
z.string().default("untitled")

// Transform / coerce (use .coerce only for known string→X conversions)
z.coerce.number()            // "5" → 5
z.string().transform(val => val.trim())
```

## In Hono

```ts
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const bodySchema = z.object({
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "IGNORED"]),
  resolutionNotes: z.string().optional().nullable(),
});

app.patch("/issues/:id", zValidator("json", bodySchema), async (c) => {
  const { status, resolutionNotes } = c.req.valid("json");
  // status is typed as "OPEN" | "INVESTIGATING" | "RESOLVED" | "IGNORED"
});
```

## Anti-patterns

- Don't define schemas inside handlers — extract to module-level consts.
- Don't use `.passthrough()` by default — strip unknown keys unless you need them.
- Don't duplicate types — `type Foo = z.infer<typeof FooSchema>`.
- Don't nest `.refine()` chains — use `.superRefine()` for multi-field validation.
