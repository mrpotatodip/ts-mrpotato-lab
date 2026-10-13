import { Hono } from "hono";
import { FaqCategoryParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { deleteFaqCategorySvc } from "#/modules/faq/handlers";
import { deleteFaqCategoryDoc } from "#/modules/faq/openapi";

const app = new Hono<AppEnv>();

app.delete(
  "/categories/:categoryId",
  deleteFaqCategoryDoc,
  requireTenantEditor,
  zValidator("param", FaqCategoryParamSchema),
  async (c) => {
    const { categoryId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(deleteFaqCategorySvc(db, c.get("tenantId"), categoryId));
    return c.json({ data, error: null });
  },
);

export default app;
