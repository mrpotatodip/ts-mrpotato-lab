import { Hono } from "hono";
import { MenuCategoryBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { addMenuCategorySvc } from "#/modules/menu/handlers";
import { addMenuCategoryDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/categories",
  addMenuCategoryDoc,
  requireTenantEditor,
  zValidator("json", MenuCategoryBodySchema),
  async (c) => {
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(addMenuCategorySvc(db, c.get("tenantId"), c.req.valid("json")));
    return c.json({ data, error: null });
  },
);

export default app;
