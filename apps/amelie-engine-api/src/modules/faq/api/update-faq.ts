import { Hono } from "hono";
import { FaqBodySchema, FaqParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { updateFaqSvc } from "#/modules/faq/handlers";
import { updateFaqDoc } from "#/modules/faq/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/:faqId",
  updateFaqDoc,
  requireTenantEditor,
  zValidator("param", FaqParamSchema),
  zValidator("json", FaqBodySchema),
  async (c) => {
    const { faqId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(updateFaqSvc(db, c.get("tenantId"), faqId, c.req.valid("json")));
    return c.json({ data, error: null });
  },
);

export default app;
