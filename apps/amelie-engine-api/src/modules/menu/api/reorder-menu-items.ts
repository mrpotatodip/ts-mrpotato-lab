import { Hono } from "hono";
import { MenuCategoryParamSchema, MenuOrderBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { reorderMenuItemsSvc } from "#/modules/menu/handlers";
import { reorderMenuItemsDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/categories/:categoryId/items/order",
  reorderMenuItemsDoc,
  requireTenantEditor,
  zValidator("param", MenuCategoryParamSchema),
  zValidator("json", MenuOrderBodySchema),
  async (c) => {
    const { categoryId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(reorderMenuItemsSvc(db, c.get("tenantId"), categoryId, c.req.valid("json").ids));
    return c.json({ data, error: null });
  },
);

export default app;
