import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";

// -----
// New Pool per call — a Pool's socket is tied
// to the request context that created it, and
// reusing one across separate Worker requests
// hangs (Workers tears down I/O between request
// contexts). Hyperdrive owns pooling to Postgres
// upstream, so a short-lived Pool per request is
// the correct pattern here.
// -----
export const db_connect = (connectionString: string) => {
  const pool = new Pool({ connectionString });
  return drizzle(pool);
};

// -----
// The driver-neutral surface, so tests can
// pass an in-process PGlite database.
// -----
export type DbConnectType = PgDatabase<PgQueryResultHKT, Record<string, never>>;
