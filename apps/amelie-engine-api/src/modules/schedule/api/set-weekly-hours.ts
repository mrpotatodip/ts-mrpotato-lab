import { Hono } from "hono";
import { LocationQuerySchema, SetWeeklyHoursBodySchema, WeekdayParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { setBusinessHoursSvc } from "#/modules/schedule/handlers";
import { setWeeklyHoursDoc } from "#/modules/schedule/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/hours/:dayOfWeek",
  setWeeklyHoursDoc,
  requirePower("store:hours:weekly:update"),
  zValidator("param", WeekdayParamSchema),
  zValidator("query", LocationQuerySchema),
  zValidator("json", SetWeeklyHoursBodySchema),
  async (c) => {
    const { dayOfWeek } = c.req.valid("param");
    const { locationId } = c.req.valid("query");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(
      setBusinessHoursSvc(db, c.get("tenantId"), { dayOfWeek, ...c.req.valid("json") }, locationId),
    );
    return c.json({ data, error: null });
  },
);

export default app;
