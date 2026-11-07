# @repo/db-elise

Drizzle schema and Neon client. Table naming and migration rules: `docs/standards/database.md`.

## Change the schema

1. Edit `src/schema/*.ts`.
2. `pnpm db:generate`. A rename makes drizzle-kit ask a question, and it needs a TTY: use `pnpm exec drizzle-kit generate --custom --name=<name>`, write the SQL by hand (`ALTER ... RENAME`, plus its constraints and indexes), then patch the new `migrations/meta/<n>_snapshot.json` to the new names. `sed` on macOS has no `\b`; use `[[:<:]]` and `[[:>:]]`.
3. `pnpm db:generate` again must print `No schema changes`.
4. `pnpm db:rehearse` applies every pending migration inside a transaction and rolls back.
5. `pnpm db:migrate` hits the live Neon database. Ask first.

## Look at the live database

`pnpm db:query "select ..."` runs one read-only statement and prints the rows.
