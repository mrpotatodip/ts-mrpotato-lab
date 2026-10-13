import { Hono } from "hono";
import { MenuOrderBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { reorderMenuCategoriesSvc } from "#/modules/menu/handlers";
import { reorderMenuCategoriesDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/categories/order",
  reorderMenuCategoriesDoc,
  requireTenantEditor,
  zValidator("json", MenuOrderBodySchema),
  async (c) => {
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(reorderMenuCategoriesSvc(db, c.get("tenantId"), c.req.valid("json").ids));
    return c.json({ data, error: null });
  },
);

export default app;
