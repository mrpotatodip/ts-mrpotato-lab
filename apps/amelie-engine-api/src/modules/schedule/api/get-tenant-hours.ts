import { Hono } from "hono";
import { Effect } from "effect";
import { LocationQuerySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getTenantScheduleSvc } from "#/modules/schedule/handlers";
import { getTenantHoursDoc } from "#/modules/schedule/openapi";
import { locateQueryLocation, requireBoundPower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.get(
  "/",
  getTenantHoursDoc,
  zValidator("query", LocationQuerySchema),
  requireBoundPower("store:hours:weekly:read", locateQueryLocation),
  async (c) => {
  const { locationId } = c.req.valid("query");
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(
    getTenantScheduleSvc(db, c.get("tenantId"), locationId, c.get("coverage")).pipe(
      Effect.map(({ timezone, weekly, specialDates }) => ({ timezone, weekly, specialDates })),
    ),
  );
  return c.json({ data, error: null });
});

export default app;
