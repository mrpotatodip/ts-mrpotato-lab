import { Hono } from "hono";
import { LocationQuerySchema, OverrideDateParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { removeHoursOverrideSvc } from "#/modules/schedule/handlers";
import { removeHoursOverrideDoc } from "#/modules/schedule/openapi";

const app = new Hono<AppEnv>();

app.delete(
  "/overrides/:date",
  removeHoursOverrideDoc,
  requirePower("store:hours:overrides:delete"),
  zValidator("param", OverrideDateParamSchema),
  zValidator("query", LocationQuerySchema),
  async (c) => {
    const { date } = c.req.valid("param");
    const { locationId } = c.req.valid("query");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(removeHoursOverrideSvc(db, c.get("tenantId"), date, locationId));
    return c.json({ data, error: null });
  },
);

export default app;
