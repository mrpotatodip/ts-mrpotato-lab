import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

// -----
// pnpm db:rehearse applies every migration the
// database has not run yet, inside a transaction
// that always rolls back, and prints the first error.
// -----
const MIGRATIONS = join(import.meta.dirname, "..", "migrations");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const journal: { entries: { tag: string; when: number }[] } = JSON.parse(readFileSync(join(MIGRATIONS, "meta", "_journal.json"), "utf8"));
    const { rows } = await client.query("select max(created_at)::bigint as last from drizzle.__drizzle_migrations");
    const last = Number(rows[0]?.last ?? 0);
    const pending = journal.entries.filter((entry) => entry.when > last);
    await client.query("begin");
    for (const entry of pending) {
      for (const statement of readFileSync(join(MIGRATIONS, `${entry.tag}.sql`), "utf8").split("--> statement-breakpoint")) {
        await client.query(statement);
      }
      console.log(`ok ${entry.tag}`);
    }
    console.log(pending.length === 0 ? "nothing pending" : `${pending.length} pending migration(s) apply cleanly (rolled back)`);
  } finally {
    await client.query("rollback");
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
