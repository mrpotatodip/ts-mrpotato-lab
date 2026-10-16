import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listCustomerThreadsSvc } from "#/modules/customer-thread/handlers";
import { listCustomerThreadsDoc } from "#/modules/customer-thread/openapi";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.get("/", listCustomerThreadsDoc,
  requirePower("company:chats:threads:read"), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listCustomerThreadsSvc(db, c.get("tenantId")));
  return c.json({ data, error: null });
});

export default app;
