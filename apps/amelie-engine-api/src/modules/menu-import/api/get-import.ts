import { Hono } from "hono";
import { ImportParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getImportSvc } from "#/modules/menu-import/handlers";
import { getImportDoc } from "#/modules/menu-import/openapi";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.get("/:importId", getImportDoc,
  requirePower("company:menu:imports:read"), zValidator("param", ImportParamSchema), async (c) => {
  const { importId } = c.req.valid("param");
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(getImportSvc(db, c.get("tenantId"), importId));
  return c.json({ data, error: null });
});

export default app;
