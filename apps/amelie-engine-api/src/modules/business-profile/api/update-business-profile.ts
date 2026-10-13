import { Hono } from "hono";
import { LocationQuerySchema, UpdateBusinessProfileBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { updateBusinessProfileSvc } from "#/modules/business-profile/handlers";
import { updateBusinessProfileDoc } from "#/modules/business-profile/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/",
  updateBusinessProfileDoc,
  requireTenantEditor,
  zValidator("query", LocationQuerySchema),
  zValidator("json", UpdateBusinessProfileBodySchema),
  async (c) => {
    const { locationId } = c.req.valid("query");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(updateBusinessProfileSvc(db, c.get("tenantId"), c.req.valid("json"), locationId));
    return c.json({ data, error: null });
  },
);

export default app;
