import { Hono } from "hono";
import { FaqCategoryBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { addFaqCategorySvc } from "#/modules/faq/handlers";
import { addFaqCategoryDoc } from "#/modules/faq/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/categories",
  addFaqCategoryDoc,
  requirePower("company:faqs:categories:create"),
  zValidator("json", FaqCategoryBodySchema),
  async (c) => {
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(addFaqCategorySvc(db, c.get("tenantId"), c.req.valid("json").name));
    return c.json({ data, error: null });
  },
);

export default app;
