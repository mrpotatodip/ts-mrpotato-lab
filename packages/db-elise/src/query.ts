import { Client } from "pg";

// -----
// pnpm db:query "select ..." runs one statement in a
// read-only transaction and prints the rows.
// -----
async function main() {
  const sql = process.argv[2];
  if (!sql) throw new Error('Usage: pnpm db:query "select ..."');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("begin read only");
    const result = await client.query(sql);
    console.log(JSON.stringify(result.rows, null, 2));
  } finally {
    await client.query("rollback");
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
