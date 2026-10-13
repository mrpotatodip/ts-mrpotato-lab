import { Hono } from "hono";
import { ImportParamSchema, PublishImportBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { publishImportSvc } from "#/modules/menu-import/handlers";
import { publishImportDoc } from "#/modules/menu-import/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/:importId/publish",
  publishImportDoc,
  requireTenantEditor,
  zValidator("param", ImportParamSchema),
  zValidator("json", PublishImportBodySchema),
  async (c) => {
    const { importId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const { mode, locationId, countryId } = c.req.valid("json");
    const data = await runEffect(publishImportSvc(db, c.get("tenantId"), importId, mode, locationId, countryId));
    return c.json({ data, error: null });
  },
);

export default app;
