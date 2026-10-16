import { Hono } from "hono";
import { AdminRoleParamSchema, SetAdminRoleEnabledBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { setAdminRoleEnabledSvc } from "#/modules/admin-role/handlers";
import { setAdminRoleEnabledDoc } from "#/modules/admin-role/openapi";

const app = new Hono<AppEnv>();

app.put("/roles/:roleId/enabled", setAdminRoleEnabledDoc, zValidator("param", AdminRoleParamSchema), zValidator("json", SetAdminRoleEnabledBodySchema), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(setAdminRoleEnabledSvc(db, c.get("userId"), c.req.valid("param").roleId, c.req.valid("json").enabled));
  return c.json({ data, error: null });
});

export default app;
