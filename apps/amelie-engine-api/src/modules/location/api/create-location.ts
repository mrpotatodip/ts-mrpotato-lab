import { Hono } from "hono";
import { CreateLocationBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getCountryScopeSvc, requireBoundPower } from "#/modules/tenant";
import { createLocationSvc } from "#/modules/location/handlers";
import { createLocationDoc } from "#/modules/location/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/",
  createLocationDoc,
  requireBoundPower("company:profile:locations:create", () => []),
  zValidator("json", CreateLocationBodySchema),
  async (c) => {
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const tenantId = c.get("tenantId");
    const scope = await runEffect(getCountryScopeSvc(db, c.get("userId"), tenantId, c.get("coverage")));
    const data = await runEffect(createLocationSvc(db, tenantId, c.req.valid("json"), scope));
    return c.json({ data, error: null }, 201);
  },
);

export default app;
