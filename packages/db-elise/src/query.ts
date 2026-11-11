import { Client } from "pg";

// -----
// pnpm db:query "select ..." [--table] runs one statement in a
// read-only transaction and prints the rows as JSON, or with
// --table as one line per row, which costs far fewer tokens.
// -----
const oneLine = (row: Record<string, unknown>) =>
  Object.entries(row)
    .map(([key, value]) => `${key}=${value === null ? "null" : typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" | ");

async function main() {
  const table = process.argv.includes("--table");
  const sql = process.argv.slice(2).find((arg) => arg !== "--table");
  if (!sql) throw new Error('Usage: pnpm db:query "select ..." [--table]');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("begin read only");
    const result = await client.query(sql);
    console.log(table ? result.rows.map(oneLine).join("\n") : JSON.stringify(result.rows, null, 2));
  } finally {
    await client.query("rollback");
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
