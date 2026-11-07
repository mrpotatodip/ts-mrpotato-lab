# Coding Standards

Reviewers read [General](docs/standards/general.md) and the scope files that match the change. Code being written does not load them.

## Scopes

| Scope | Applies to |
|---|---|
| [General](docs/standards/general.md) | All code in every app and package, whether a person or an agent wrote it |
| [Hono JS](docs/standards/hono.md) | Route code in every Hono backend app |
| [React](docs/standards/react.md) | React frontend apps built on TanStack Start, Router, Query and Form |
| [Worker frontend](docs/standards/worker-frontend.md) | A TanStack Start app on Cloudflare Workers that holds secrets, bindings or a session |
| [Contracts](docs/standards/contracts.md) | The shared contracts package: Zod schemas shared across apps |
| [Shared packages](docs/standards/shared-packages.md) | `packages/*` libraries with runtime code that apps import (not contracts, not database packages) |
| [Effect](docs/standards/effect.md) | Code written with the `effect` library: effects, typed errors, and the boundary where they run |
| [Database](docs/standards/database.md) | `packages/db-elise`: table names, schema and migrations |
| [Agents development](docs/standards/agents-development.md) | A backend's chat-bot agents and the tools they call: `{module}/agents/` and `{module}/agent-tools/` |

Each scope is its own file under `docs/standards/` with one top-level `#` heading, and every section heading inside it starts with the scope name ("Hono JS:", "React:"). Add a new scope (for example Drizzle) as its own file and a row in this table. Don't mix its rules into another scope.

Pick one well-built module per scope as the reference implementation, and point reviewers at it in the repo's `CLAUDE.md` or README.

## Rule tags

Every rule starts with a tag saying where it comes from:

- **`[Hono docs]`**, **`[React docs]`**, **`[TanStack docs]`**, **`[Effect docs]`**: taken from that library's official documentation, with a link to the page.
- **`[House]`**: a convention of this codebase, not something the library prescribes.
