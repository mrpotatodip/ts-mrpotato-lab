import { ACCESS_POWERS } from "@repo/contracts/amelie";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { accessMasterPowers } from "./schema";

export type SyncAccessMasterPowersDb = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export async function syncAccessMasterPowers(db: SyncAccessMasterPowersDb) {
  const known = await db.select({ power: accessMasterPowers.power }).from(accessMasterPowers);
  const knownSet = new Set(known.map((row) => row.power));
  const missing = ACCESS_POWERS.filter((power) => !knownSet.has(power));
  if (missing.length > 0) {
    await db
      .insert(accessMasterPowers)
      .values(missing.map((power) => ({ power, scope: power.startsWith("platform:") ? ("platform" as const) : ("tenant" as const) })))
      .onConflictDoNothing();
  }
  const catalogue = new Set<string>(ACCESS_POWERS);
  const retired = known.map((row) => row.power).filter((power) => !catalogue.has(power));
  return { added: missing, retired };
}
