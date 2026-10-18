import { Hono } from "hono";
import { LocationParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { archiveLocationPreviewSvc } from "#/modules/location/handlers";
import { archiveLocationPreviewDoc } from "#/modules/location/openapi";

const app = new Hono<AppEnv>();

app.get(
  "/:locationId/archive-preview",
  archiveLocationPreviewDoc,
  requirePower("company:profile:locations:archive"),
  zValidator("param", LocationParamSchema),
  async (c) => {
    const { locationId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(archiveLocationPreviewSvc(db, c.get("tenantId"), locationId));
    return c.json({ data, error: null });
  },
);

export default app;
