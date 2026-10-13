import { Hono } from "hono";
import { CustomerThreadParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getCustomerThreadSvc } from "#/modules/customer-thread/handlers";
import { getCustomerThreadDoc } from "#/modules/customer-thread/openapi";

const app = new Hono<AppEnv>();

app.get("/:threadId", getCustomerThreadDoc, zValidator("param", CustomerThreadParamSchema), async (c) => {
  const { threadId } = c.req.valid("param");
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(getCustomerThreadSvc(db, c.get("tenantId"), threadId));
  return c.json({ data, error: null });
});

export default app;
