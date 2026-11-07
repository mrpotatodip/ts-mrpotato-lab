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
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return { db, close: () => client.close() };
}
