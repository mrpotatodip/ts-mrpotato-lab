import { createDb, createPoolDb, createTenantDb } from "@repo/db-elise/client";
import type * as schema from "@repo/db-elise/schema";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

export type DbConnectType = ReturnType<typeof createDb>;
export type PoolDbType = ReturnType<typeof createPoolDb>["db"];

export const dbConnect = (url: string): DbConnectType => createDb(url);

// -----
// For code that needs a transaction: sign-up and
// better-auth. Call close() when the request ends.
// -----
export const poolConnect = (url: string) => createPoolDb(url);

// -----
// One transaction of the elise_app role, with app.tenant_id
// set. A query that forgets its tenant filter sees only this
// account's rows.
// -----
export type TenantDbType = Parameters<Parameters<ReturnType<typeof createTenantDb>["db"]["transaction"]>[0]>[0];

// -----
// What a service needs of a database: queries, no transaction.
// The HTTP client and a withTenant transaction both satisfy it,
// so a service takes this one type and a route can pass either.
// -----
export type AppDbType = Pick<PgDatabase<PgQueryResultHKT, typeof schema>, "select" | "insert" | "update" | "delete">;

// -----
// Runs a job as one account on the elise_app role over
// Hyperdrive. set_config(..., true) lasts for this transaction
// only, so a pooled connection never carries it to the next
// request. Caching must be off on the Hyperdrive config.
// -----
export const withTenant = async <T>(
  connectionString: string,
  waitUntil: (promise: Promise<unknown>) => void,
  accountId: string,
  run: (db: TenantDbType) => Promise<T>,
): Promise<T> => {
  const { db, connect, close } = createTenantDb(connectionString);
  try {
    await connect();
    return await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${accountId}, true)`);
      return run(tx);
    });
  } finally {
    waitUntil(close());
  }
};

// -----
// Runs a job on a pooled connection and closes the
// pool after the answer, through waitUntil.
// -----
export const withPool = async <T>(
  url: string,
  waitUntil: (promise: Promise<unknown>) => void,
  run: (db: PoolDbType) => Promise<T>,
): Promise<T> => {
  const { db, close } = poolConnect(url);
  try {
    return await run(db);
  } finally {
    waitUntil(close());
  }
};
