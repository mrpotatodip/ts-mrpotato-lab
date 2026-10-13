import { Hono } from "hono";
import { FaqBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { addFaqSvc } from "#/modules/faq/handlers";
import { addFaqDoc } from "#/modules/faq/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/",
  addFaqDoc,
  requireTenantEditor,
  zValidator("json", FaqBodySchema),
  async (c) => {
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(addFaqSvc(db, c.get("tenantId"), c.req.valid("json")));
    return c.json({ data, error: null });
  },
);

export default app;
