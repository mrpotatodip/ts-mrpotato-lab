import { Hono } from "hono";
import { CreateLocationBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { createLocationSvc } from "#/modules/location/handlers";
import { createLocationDoc } from "#/modules/location/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/",
  createLocationDoc,
  requireTenantEditor,
  zValidator("json", CreateLocationBodySchema),
  async (c) => {
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(createLocationSvc(db, c.get("tenantId"), c.req.valid("json")));
    return c.json({ data, error: null }, 201);
  },
);

export default app;
