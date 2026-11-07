import { eq } from "drizzle-orm";
import { db } from "./client";
import { generateInviteCode, hashInviteCode } from "./invite-code";
import { authUser, platformInviteCodes } from "./schema";

// -----
// pnpm db:create-invite-code --email you@example.com [--uses 1] [--note "for Ada"]
// The email is the login that hands the code out.
// The code is printed once; only its hash is stored.
// -----
const flag = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
};

async function main() {
  const email = flag("email");
  if (!email) throw new Error('Usage: pnpm db:create-invite-code --email you@example.com [--uses 1] [--note "text"]');
  const maxUses = Number(flag("uses") ?? "1");
  if (!Number.isInteger(maxUses) || maxUses < 1) throw new Error("--uses must be a whole number of at least 1");
  const [login] = await db.select().from(authUser).where(eq(authUser.email, email));
  if (!login) throw new Error(`No login has the email ${email}`);
  const code = generateInviteCode();
  await db.insert(platformInviteCodes).values({
    note: flag("note") ?? "",
    maxUses,
    codeHash: await hashInviteCode(code),
    createdBy: login.partyId,
  });
  console.log(`Invite code (shown once): ${code}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
