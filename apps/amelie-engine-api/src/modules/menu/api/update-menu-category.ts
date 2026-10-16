import { Hono } from "hono";
import { MenuCategoryBodySchema, MenuCategoryParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { updateMenuCategorySvc } from "#/modules/menu/handlers";
import { updateMenuCategoryDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/categories/:categoryId",
  updateMenuCategoryDoc,
  requirePower("company:menu:categories:update"),
  zValidator("param", MenuCategoryParamSchema),
  zValidator("json", MenuCategoryBodySchema),
  async (c) => {
    const { categoryId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(updateMenuCategorySvc(db, c.get("tenantId"), categoryId, c.req.valid("json")));
    return c.json({ data, error: null });
  },
);

export default app;
