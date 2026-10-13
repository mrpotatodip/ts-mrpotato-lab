import { Hono } from "hono";
import { MenuItemImageNestedParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { setMenuItemImageCoverSvc } from "#/modules/menu/handlers";
import { setMenuItemImageCoverDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/items/:itemId/images/:imageId/cover",
  setMenuItemImageCoverDoc,
  requireTenantEditor,
  zValidator("param", MenuItemImageNestedParamSchema),
  async (c) => {
    const { itemId, imageId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(setMenuItemImageCoverSvc(db, c.get("tenantId"), itemId, imageId));
    return c.json({ data, error: null });
  },
);

export default app;
