import { Hono } from "hono";
import { LocationParamSchema, UpdateLocationBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireBoundPower } from "#/modules/tenant";
import { locateLocationParam } from "#/modules/location/lib";
import { updateLocationSvc } from "#/modules/location/handlers";
import { updateLocationDoc } from "#/modules/location/openapi";

const app = new Hono<AppEnv>();

app.patch(
  "/:locationId",
  updateLocationDoc,
  zValidator("param", LocationParamSchema),
  requireBoundPower("company:profile:locations:update", locateLocationParam),
  zValidator("json", UpdateLocationBodySchema),
  async (c) => {
    const { locationId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(updateLocationSvc(db, c.get("tenantId"), locationId, c.req.valid("json")));
    return c.json({ data, error: null });
  },
);

export default app;
