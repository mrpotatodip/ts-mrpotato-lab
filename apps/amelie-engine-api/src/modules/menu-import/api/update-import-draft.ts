import { Hono } from "hono";
import { ImportDraftParamSchema, UpdateImportDraftBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { updateImportDraftSvc } from "#/modules/menu-import/handlers";
import { updateImportDraftDoc } from "#/modules/menu-import/openapi";

const app = new Hono<AppEnv>();

app.patch(
  "/:importId/drafts/:draftId",
  updateImportDraftDoc,
  requireTenantEditor,
  zValidator("param", ImportDraftParamSchema),
  zValidator("json", UpdateImportDraftBodySchema),
  async (c) => {
    const { importId, draftId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(updateImportDraftSvc(db, c.get("tenantId"), importId, draftId, c.req.valid("json")));
    return c.json({ data, error: null });
  },
);

export default app;
