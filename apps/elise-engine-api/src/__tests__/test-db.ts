import { createTestDb } from "@repo/db-elise/test-db";
import { parties, partyMasterTypes, partyPersons, tenants } from "@repo/db-elise/schema";
import { eq } from "drizzle-orm";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";

// -----
// A fresh in-memory Postgres with every migration applied.
// The engine's queries are typed for Neon's drivers; pglite
// answers the same calls, so one cast bridges them.
// -----
export async function openTestDb() {
  const { db, close } = await createTestDb(MIGRATIONS_DIR);
  // SAFETY: the queries under test use only select, insert, update, delete and transaction, which pglite supports like Neon's HTTP driver.
  const http: DbConnectType = db as never;
  // SAFETY: the same calls, plus transaction, which pglite and Neon's pool driver both support.
  const pool: PoolDbType = db as never;
  return { http, pool, raw: db, close };
}

export type TestDb = Awaited<ReturnType<typeof openTestDb>>;

export async function seedTenant(test: TestDb, slug = "acme") {
  const [type] = await test.raw.select().from(partyMasterTypes).where(eq(partyMasterTypes.key, "person"));
  const [party] = await test.raw.insert(parties).values({ masterTypeId: type.id }).returning();
  await test.raw.insert(partyPersons).values({ partyId: party.id, firstName: "Ada", lastName: "Rossi" });
  const [tenant] = await test.raw.insert(tenants).values({ partyId: party.id, name: slug, slug, timezone: "UTC" }).returning();
  return { tenantId: tenant.id, partyId: party.id };
}
