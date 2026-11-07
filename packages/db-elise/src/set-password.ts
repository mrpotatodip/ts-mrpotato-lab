import { hashPassword } from "better-auth/crypto";
import { Client } from "pg";

// -----
// NEW_PASSWORD='...' pnpm db:set-password --email you@example.com
// Hashes the password the way better-auth checks it, replaces the
// credential and ends the login's sessions. The password comes from
// the environment so it stays out of the process list.
// -----
async function main() {
  const at = process.argv.indexOf("--email");
  const email = at === -1 ? undefined : process.argv[at + 1];
  const password = process.env.NEW_PASSWORD;
  if (!email || !password) throw new Error("Usage: NEW_PASSWORD='...' pnpm db:set-password --email you@example.com");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const hash = await hashPassword(password);
    await client.query("begin");
    const updated = await client.query(
      "update auth_account set password = $1, updated_at = now() where provider_id = 'credential' and user_id = (select id from auth_user where email = $2)",
      [hash, email],
    );
    if (updated.rowCount !== 1) throw new Error(`No credential login has the email ${email}`);
    await client.query("delete from auth_session where user_id = (select id from auth_user where email = $1)", [email]);
    await client.query("commit");
    console.log(`password changed for ${email}; its sessions are ended`);
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
