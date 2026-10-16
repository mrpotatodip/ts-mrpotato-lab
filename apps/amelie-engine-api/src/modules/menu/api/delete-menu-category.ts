import { Hono } from "hono";
import { MenuCategoryParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { deleteMenuCategoryWithImagesSvc } from "#/modules/menu/handlers";
import { createMenuImageStorage } from "#/modules/menu/lib";
import { deleteMenuCategoryDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.delete(
  "/categories/:categoryId",
  deleteMenuCategoryDoc,
  requirePower("company:menu:categories:delete"),
  zValidator("param", MenuCategoryParamSchema),
  async (c) => {
    const { categoryId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(
      deleteMenuCategoryWithImagesSvc(db, createMenuImageStorage(c.env), c.get("tenantId"), categoryId),
    );
    return c.json({ data, error: null });
  },
);

export default app;
