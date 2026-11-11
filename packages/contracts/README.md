# @repo/contracts

Zod schemas, and the types inferred from them, for every JSON shape that crosses a workspace boundary. The engine validates a request with a schema from here and the dashboard validates its form with the same one, so the two cannot drift.

Depends on `zod` and `@repo/chat-bot-api`. There is no build step: `exports` point at the `.ts` source and each app's bundler compiles it.

## Entry points

| Import | Holds |
| --- | --- |
| `@repo/contracts/elise` | Everything EliseLAB: scans, repos, verdicts, files, teams, groups, credit, GitHub installs, runners, sign-up. |
| `@repo/contracts/response` | `ResponseEnvelope<T>` and `PaginatedResponse<T>`. |
| `@repo/contracts/chat-bots` | The chat-bot output and turn shapes. |

Every response uses the `{ data, error }` envelope. Success has `error: null`, failure has `data: null`.

## Adding or changing a schema

- A shape used by one app stays in that app. Put it here only when a second workspace sends or receives it.
- If the other app already has its own copy, move it here and delete every copy in the same PR.
- Never import a database package, Hono, React or an app from this package.
- A contract change has a deploy order. Read `docs/standards/contracts.md` section 5 before any deploy that touches this package.
- `zod` is pinned to `4.4.3` in the root pnpm overrides, so every package shares one copy.

```bash
pnpm --filter @repo/contracts check   # tsc --noEmit
```

The full rules are in `docs/standards/contracts.md`.
