import { Hono } from "hono";
import { ImportParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { approveAllImportDraftsSvc } from "#/modules/menu-import/handlers";
import { approveAllImportDraftsDoc } from "#/modules/menu-import/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/:importId/approve-all",
  approveAllImportDraftsDoc,
  requirePower("company:menu:import_drafts:update"),
  zValidator("param", ImportParamSchema),
  async (c) => {
    const { importId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(approveAllImportDraftsSvc(db, c.get("tenantId"), importId));
    return c.json({ data, error: null });
  },
);

export default app;
