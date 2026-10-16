import { Hono } from "hono";
import { LocationParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { archiveLocationReturningIdSvc } from "#/modules/location/handlers";
import { archiveLocationDoc } from "#/modules/location/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/:locationId/archive",
  archiveLocationDoc,
  requirePower("company:profile:locations:archive"),
  zValidator("param", LocationParamSchema),
  async (c) => {
    const { locationId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(archiveLocationReturningIdSvc(db, c.get("tenantId"), locationId));
    return c.json({ data, error: null });
  },
);

export default app;
