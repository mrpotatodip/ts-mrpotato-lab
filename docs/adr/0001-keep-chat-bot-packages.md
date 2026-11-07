# Keep the chat-bot packages

The five `packages/chat-bot*` packages came from Amelie. They stay: Elise will use them for chat.

- Each has a `check` script, and `pnpm check:apps` runs them.
- `@tanstack/ai`, `ai-client` and `ai-react` are pinned in the root `pnpm.overrides`, and `patches/@tanstack__ai-client@0.36.0.patch` fits that exact version. Change the pins and the patch together.
- Open: `packages/contracts/src/elise/` still holds Amelie-named folders (`tenant`, `customer-thread`, `unanswered-question`, `public-chat`, `team`), and `db-elise` has matching tables. Removing them needs a migration, so it waits for a decision.
