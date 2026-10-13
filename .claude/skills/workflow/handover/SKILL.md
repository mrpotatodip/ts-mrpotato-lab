---
name: handover
description: Generate a comprehensive REST API reference for handover from the API layer to the frontend layer. Run on demand to produce or load the handover document.
---

# Handover — API to Frontend

Captures every REST endpoint, response schema, enum, and pattern in the API project and writes them to a structured handover document. Run it when you need it.

## How to Invoke

**To generate the handover document (run from the API project):**

```
/handover generate
```

**To load the handover document (run from the frontend):**

```
/handover load
```

---

## Generate Mode

When the developer runs `/handover generate`:

### Step 1 — Read context files

Read these files to understand what this project is:

1. `context/project-overview.md` — what the project does, stack, conventions
2. `context/architecture.md` — module structure, key architectural patterns
3. `context/code-standards.md` — REST API patterns, error handling, Zod conventions
4. `context/progress-tracker.md` — feature completion status, known gaps, disabled items

### Step 2 — Read REST API source files

Find and read every file in `src/modules/execution/api/` — these contain the actual route implementations.

For each route file, extract:

- HTTP method (GET / POST)
- Path pattern (e.g., `/:id/pause`)
- Path param schema (if any)
- Query param schema (if any)
- Request body schema (if any)
- Status codes returned (200, 404, 400, 500)
- Success response shape
- Error response shapes per status code

### Step 3 — Read response schema files

Find and read every schema file in `src/modules/execution/schemas/` that contains response schemas or param schemas.

Extract:

- The exact Zod schema definition
- The inferred TypeScript type
- How the schema is nested (envelope structure)

### Step 4 — Generate api-handover.md

Write the file to `context/load/api-handover.md` in the API project.

The document must contain these sections, in this order:

#### 1. Project Overview

- Brief description of the engine
- Base URL (`http://localhost:8787`)
- CORS configuration (origin, methods, headers)
- Response envelope convention: `{ data: T | null, error: string | ZodIssue[] | null }`

#### 2. Endpoint Reference

For every REST endpoint, generate a subsection with:

- **Path** and **method**
- **Path params** (name, type, description)
- **Query params** (name, type, required, default, description) — if applicable
- **Success response** — exact TypeScript type
- **Error responses** — status code, error shape, when it occurs
- **Example** — optional, if the param schema is complex

#### 3. Data Structures

For every response data type:

- Complete TypeScript interface with field names, types, and descriptions
- Mark nullable vs required fields clearly

#### 4. Enums

- `ExecutionStatus` — all values with descriptions
- `LogLevel` — all values with descriptions

#### 5. Status Lifecycle

- State machine describing valid transitions
- Which actions (pause/cancel/resume/rerun) are available in which states
- Include a text-based flow diagram

#### 6. Error Handling

- Response envelope structure
- HTTP status code mapping per error type
- Error hierarchy (NotFoundError → 404, ValidationError → 400, etc.)
- Response validation failures (ZodIssue array on 500)

#### 7. Frontend Consumption Patterns

- How to call the API (endpoint path structure, param format)
- Response schema validation approach (Zod `safeParse` pattern)
- How to handle pagination (limit/offset, total)
- The `apiClient` pattern from the frontend project
- Error handling with `tryCatch` + `ApiError`
- Status-based action gating (pause only for running, resume only for paused, etc.)

#### 8. Known Gaps

- Any features that are documented but not yet implemented
- Disabled functionality
- Placeholder handlers
- Any open questions relevant to frontend

### Step 5 — Confirm

After writing the file, confirm:

```
api-handover.md generated at context/load/.

Send this file to the frontend team.
They place it in their own context/load/ folder.
```

---

## Load Mode

When the developer runs `/handover load` from the frontend project:

### Step 1 — Find the handover

Read `context/load/api-handover.md` (placed there manually by the frontend team).

If it does not exist:

```
No api-handover.md found in context/load/.

Ask the backend team to generate and send one.
```

### Step 2 — Read and summarise

Read the file. Then print a structured summary:

```
API Handover loaded. Here is the contract:

**Base URL:** http://localhost:8787/api/execution
**Endpoints:** [X] total (list, detail, logs, retry-chain, pause, cancel, resume, rerun)
**Data types:** ExecutionDetails, LogDetails, [N] response envelopes
**Enums:** ExecutionStatus ([N] values), LogLevel ([N] values)

Key patterns for frontend:
- [Pattern 1]
- [Pattern 2]
- [Pattern 3]

**Known gaps:**
- [Gap 1]
- [Gap 2]

Full reference available in the document.
```

Do not start building. Let the developer confirm they are ready.
