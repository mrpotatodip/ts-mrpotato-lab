import { db } from "./client";
import { addSuperuser } from "./superuser";

// -----
// pnpm db:add-superuser --email you@example.com
// The login must already exist.
// -----
async function main() {
  const flag = process.argv.indexOf("--email");
  const email = flag === -1 ? undefined : process.argv[flag + 1];
  if (!email) throw new Error("Usage: pnpm db:add-superuser --email you@example.com");
  const result = await addSuperuser(db, email);
  console.log(result.added ? `${email} is now a superuser` : `${email} was already a superuser`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
