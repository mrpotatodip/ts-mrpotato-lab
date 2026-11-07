import { Client } from "pg";

// -----
// pnpm db:exec "delete from ..." [--dry]
// Runs one statement in a transaction and prints the row count
// and any rows it returns. --dry rolls it back. This writes to
// the live database: ask first.
// -----
async function main() {
  const sql = process.argv[2];
  if (!sql || sql.startsWith("--")) throw new Error('Usage: pnpm db:exec "statement" [--dry]');
  const dry = process.argv.includes("--dry");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("begin");
    const result = await client.query(sql);
    console.log(`${result.rowCount ?? 0} row(s)${dry ? " (dry run, rolled back)" : ""}`);
    if (result.rows.length > 0) console.log(JSON.stringify(result.rows, null, 2));
    await client.query(dry ? "rollback" : "commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
