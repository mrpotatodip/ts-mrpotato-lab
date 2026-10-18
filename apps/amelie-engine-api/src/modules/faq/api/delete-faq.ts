import { Hono } from "hono";
import { FaqParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireBoundPower } from "#/modules/tenant";
import { deleteFaqSvc } from "#/modules/faq/handlers";
import { deleteFaqDoc } from "#/modules/faq/openapi";

// -----
// The FAQ is named by id, so the route names no Location;
// deleteFaqSvc checks the stored scope against coverage.
// -----
const app = new Hono<AppEnv>();

app.delete(
  "/:faqId",
  deleteFaqDoc,
  zValidator("param", FaqParamSchema),
  requireBoundPower("company:faqs:faqs:delete", () => []),
  async (c) => {
    const { faqId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(deleteFaqSvc(db, c.get("tenantId"), faqId, c.get("coverage")));
    return c.json({ data, error: null });
  },
);

export default app;
