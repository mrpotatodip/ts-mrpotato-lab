import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon, Pool } from "@neondatabase/serverless";
import { Client } from "pg";
import * as schema from "./schema";

export function createDb(url: string) {
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// -----
// The HTTP client above cannot run a transaction.
// This one speaks over a WebSocket pool and can;
// call close() once the request is done. Neon can drop a
// connection that sits idle in the pool. Without an error
// listener the pool rethrows that as an uncaught error and
// crashes the Worker, so it is logged and the pool opens a
// new connection on the next query.
// -----
export function createPoolDb(url: string) {
  const pool = new Pool({ connectionString: url });
  pool.on("error", (error: Error) => console.error("db: idle pool connection lost", error.message));
  return { db: drizzlePool(pool, { schema }), close: () => pool.end() };
}

// -----
// For the tenant-scoped routes: a node-postgres client over
// Hyperdrive, signed in as the elise_app role (no BYPASSRLS).
// Hyperdrive pools the connection, so one client per request
// is fine; call close() once the request is done. The caller
// runs every query inside withTenant, which sets app.tenant_id.
// -----
export function createTenantDb(connectionString: string) {
  const client = new Client({ connectionString });
  client.on("error", (error: Error) => console.error("db: tenant connection lost", error.message));
  return { db: drizzlePg(client, { schema }), connect: () => client.connect(), close: () => client.end() };
}

let _db: ReturnType<typeof createDb>;

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    if (!_db) {
      _db = createDb(process.env.DATABASE_URL!);
    }
    return Reflect.get(_db, prop);
  },
});
