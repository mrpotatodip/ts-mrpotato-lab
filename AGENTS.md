# AGENTS.md

## Purpose

This repository uses an orchestrator-first architecture.

All tasks MUST be delegated through the appropriate orchestrator agent before implementation begins.

Agents MUST NOT perform implementation work directly unless they were invoked by an orchestrator.

---

## Agent Hierarchy

### Backend

backend-orchestrator
├── architect
├── database
├── services
├── api
├── worker
├── testing
└── documentation

### Frontend

frontend-orchestrator
├── frontend
├── component-pattern
├── ui
├── testing
└── documentation

---

## Global Rules

### Rule 1: Always Use An Orchestrator

For every user request:

1. Determine whether the task is Backend, Frontend, or Cross-Functional.
2. Invoke the appropriate orchestrator.
3. Allow the orchestrator to create and coordinate sub-agents.
4. Do not skip the orchestrator layer.

Examples:

- API endpoint → backend-orchestrator
- Database schema → backend-orchestrator
- Worker logic → backend-orchestrator
- React component → frontend-orchestrator
- UI redesign → frontend-orchestrator
- Full feature implementation → both orchestrators as required

---

### Rule 2: Backend Ownership

backend-orchestrator owns:

- Architecture decisions
- Domain modeling
- Database schemas
- Drizzle migrations
- Services
- Hono routes
- Cloudflare Workers
- Queues
- Scheduled jobs
- Testing
- Backend documentation

---

### Rule 3: Frontend Ownership

frontend-orchestrator owns:

- React components
- TanStack Start
- TanStack Router
- TanStack Query
- UI architecture
- shadcn/ui
- Tailwind CSS
- Frontend testing
- Frontend documentation

---

### Rule 4: Orchestrators Coordinate Work

Orchestrators are responsible for:

- Breaking work into tasks
- Selecting agents
- Validating outputs
- Ensuring standards compliance
- Coordinating dependencies
- Producing final implementation plans

Orchestrators should prefer multiple specialized agents over one large implementation.

---

### Rule 5: Branch Names

Work lands on `<project>/<type>/<kebab-description>`. `project` is an `apps/` or `packages/` folder, or `root`. Confirm with `pnpm lint:branch` (or `BRANCH=<name> pnpm lint:branch`) before creating the branch. Husky runs that check on commit.

---

## Backend Workflow

When backend-orchestrator receives a task:

1. architect analyzes requirements
2. database designs schema
3. services implement business logic
4. api exposes endpoints
5. worker implements async processing
6. testing validates behavior
7. documentation updates references

No implementation should bypass this workflow unless explicitly unnecessary.

---

## Frontend Workflow

When frontend-orchestrator receives a task:

1. frontend designs feature structure
2. component-pattern discovers and enforces structural patterns
3. ui builds components
4. testing validates functionality
5. documentation updates references

No implementation should bypass this workflow unless explicitly unnecessary.

---

## Skill Usage

Agents should load relevant skills before implementation.

Examples:

- database → drizzle-schema skill
- api → hono-api skill
- worker → cloudflare-worker skill
- testing → testing skill
- documentation → documentation skill

Skills define standards.
Agents perform work.
Orchestrators coordinate everything.

---

## Cross-Functional Features

For features requiring frontend and backend work:

1. Invoke backend-orchestrator.
2. Invoke frontend-orchestrator.
3. Backend defines contracts first.
4. Frontend consumes contracts.
5. Testing validates end-to-end behavior.
6. Documentation updates all affected areas.

---

## Architecture Principle

Always prefer:

Orchestrator
→ Specialist Agent
→ Skill
→ Implementation

Never:

User Request
→ Direct Implementation

Every task should pass through the orchestrator layer first.
