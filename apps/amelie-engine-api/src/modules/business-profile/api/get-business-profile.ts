import { Hono } from "hono";
import { LocationQuerySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getBusinessProfileSvc } from "#/modules/business-profile/handlers";
import { getBusinessProfileDoc } from "#/modules/business-profile/openapi";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.get("/", getBusinessProfileDoc,
  requirePower("company:profile:business_profile:read"), zValidator("query", LocationQuerySchema), async (c) => {
  const { locationId } = c.req.valid("query");
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(getBusinessProfileSvc(db, c.get("tenantId"), locationId));
  return c.json({ data, error: null });
});

export default app;
