import { db } from "./client";
import { syncAccessMasterPowers } from "./sync-access-master-powers";

async function main() {
  const { added, retired } = await syncAccessMasterPowers(db);
  console.log(`added ${added.length} power(s)${added.length ? `: ${added.join(", ")}` : ""}`);
  if (retired.length > 0) console.log(`in the database but not the catalogue (left alone): ${retired.join(", ")}`);
  process.exit(0);
}

main();
