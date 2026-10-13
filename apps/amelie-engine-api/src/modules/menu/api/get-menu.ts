import { Hono } from "hono";
import { MenuQuerySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getMenuEditorSvc } from "#/modules/menu/handlers";
import { getMenuDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.get(
  "/",
  getMenuDoc,
  zValidator("query", MenuQuerySchema),
  async (c) => {
    const { locationId, countryId } = c.req.valid("query");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(getMenuEditorSvc(db, c.get("tenantId"), locationId, countryId));
    return c.json({ data, error: null });
  },
);

export default app;
