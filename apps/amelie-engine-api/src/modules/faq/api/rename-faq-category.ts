import { Hono } from "hono";
import { FaqCategoryBodySchema, FaqCategoryParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { renameFaqCategorySvc } from "#/modules/faq/handlers";
import { renameFaqCategoryDoc } from "#/modules/faq/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/categories/:categoryId",
  renameFaqCategoryDoc,
  requirePower("company:faqs:categories:update"),
  zValidator("param", FaqCategoryParamSchema),
  zValidator("json", FaqCategoryBodySchema),
  async (c) => {
    const { categoryId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(renameFaqCategorySvc(db, c.get("tenantId"), categoryId, c.req.valid("json").name));
    return c.json({ data, error: null });
  },
);

export default app;
