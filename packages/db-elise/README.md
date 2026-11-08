# @repo/db-elise

Drizzle schema and Neon client. Table naming and migration rules: `docs/standards/database.md`.

## Change the schema

1. Edit `src/schema/*.ts`.
2. `pnpm db:generate`. A rename makes drizzle-kit ask a question, and it needs a TTY: use `pnpm exec drizzle-kit generate --custom --name=<name>`, write the SQL by hand (`ALTER ... RENAME`, plus its constraints and indexes), then patch the new `migrations/meta/<n>_snapshot.json` to the new names. `sed` on macOS has no `\b`; use `[[:<:]]` and `[[:>:]]`.
3. `pnpm db:generate` again must print `No schema changes`.
4. `pnpm db:rehearse` applies every pending migration inside a transaction and rolls back.
5. `pnpm db:migrate` hits the live Neon database. Ask first.

## What `db:generate` gets wrong

Read the generated SQL before step 3. Fix these by hand in the `.sql` file; the snapshot stays as generated.

- **Drop and add on one table.** A column dropped and another added in the same table makes drizzle-kit ask "rename?", which needs a TTY. Split it: generate the add with the old column kept, then generate the drop in a second migration.
- **Foreign keys before the unique index they reference.** A composite foreign key to `(id, tenant_id)` fails with "no unique constraint matching given keys" when the index is created after it. Move the `CREATE UNIQUE INDEX` above the `ADD CONSTRAINT`. `db:rehearse` reports it.
- **`NOT NULL` on a table that has rows.** Add the column nullable, backfill it, then `ALTER COLUMN ... SET NOT NULL`. The first migration is only safe on an empty table.

`db:rehearse` runs on the live data, so it is also the check for a backfill. Compare the live counts first with `db:query`.

## Look at the live database

`pnpm db:query "select ..."` runs one read-only statement and prints the rows.
