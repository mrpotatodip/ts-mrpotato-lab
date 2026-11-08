import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

// -----
// An in-memory Postgres with every migration applied, for
// tests of queries. Each call is a fresh database. The
// migrations seed the master roles and party types. The
// caller names the folder, so this file needs no Node types.
// -----
export async function createTestDb(migrationsFolder: string) {
  const client = new PGlite();
  const drizzled = drizzle(client, { schema });
  await migrate(drizzled, { migrationsFolder });
  // -----
  // Neon's HTTP driver has db.batch: queries that run as one
  // transaction. pglite has one connection, so begin and
  // commit around the awaited queries do the same.
  // -----
  const batch = async (queries: PromiseLike<unknown>[]) => {
    await client.exec("begin");
    try {
      const results: unknown[] = [];
      for (const query of queries) results.push(await query);
      await client.exec("commit");
      return results;
    } catch (error) {
      await client.exec("rollback");
      throw error;
    }
  };
  const db = Object.assign(drizzled, { batch });
  return { db, close: () => client.close() };
}
