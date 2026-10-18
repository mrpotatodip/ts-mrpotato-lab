import { Hono } from "hono";
import { LocationQuerySchema, OverrideDateParamSchema, SetHoursOverrideBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { locateQueryLocation, requireBoundPower } from "#/modules/tenant";
import { setHoursOverrideSvc } from "#/modules/schedule/handlers";
import { setHoursOverrideDoc } from "#/modules/schedule/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/overrides/:date",
  setHoursOverrideDoc,
  zValidator("param", OverrideDateParamSchema),
  zValidator("query", LocationQuerySchema),
  zValidator("json", SetHoursOverrideBodySchema),
  requireBoundPower("store:hours:overrides:update", locateQueryLocation),
  async (c) => {
    const { date } = c.req.valid("param");
    const { locationId } = c.req.valid("query");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(
      setHoursOverrideSvc(db, c.get("tenantId"), { date, ...c.req.valid("json") }, locationId, c.get("coverage")),
    );
    return c.json({ data, error: null });
  },
);

export default app;
