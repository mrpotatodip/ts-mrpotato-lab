import { Hono } from "hono";
import { FaqBodySchema, FaqParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireBoundPower } from "#/modules/tenant";
import { locateBodyLocation } from "#/modules/faq/lib/locate-body-location";
import { updateFaqSvc } from "#/modules/faq/handlers";
import { updateFaqDoc } from "#/modules/faq/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/:faqId",
  updateFaqDoc,
  zValidator("param", FaqParamSchema),
  zValidator("json", FaqBodySchema),
  requireBoundPower("company:faqs:faqs:update", locateBodyLocation),
  async (c) => {
    const { faqId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(updateFaqSvc(db, c.get("tenantId"), faqId, c.req.valid("json"), c.get("coverage")));
    return c.json({ data, error: null });
  },
);

export default app;
