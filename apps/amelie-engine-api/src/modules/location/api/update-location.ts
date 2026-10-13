import { Hono } from "hono";
import { LocationParamSchema, UpdateLocationBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { updateLocationSvc } from "#/modules/location/handlers";
import { updateLocationDoc } from "#/modules/location/openapi";

const app = new Hono<AppEnv>();

app.patch(
  "/:locationId",
  updateLocationDoc,
  requireTenantEditor,
  zValidator("param", LocationParamSchema),
  zValidator("json", UpdateLocationBodySchema),
  async (c) => {
    const { locationId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(updateLocationSvc(db, c.get("tenantId"), locationId, c.req.valid("json")));
    return c.json({ data, error: null });
  },
);

export default app;
