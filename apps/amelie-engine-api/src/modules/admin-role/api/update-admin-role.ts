import { Hono } from "hono";
import { AdminRoleParamSchema, UpdateAdminRoleBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { updateAdminRoleSvc } from "#/modules/admin-role/handlers";
import { updateAdminRoleDoc } from "#/modules/admin-role/openapi";

const app = new Hono<AppEnv>();

app.patch("/roles/:roleId", updateAdminRoleDoc, zValidator("param", AdminRoleParamSchema), zValidator("json", UpdateAdminRoleBodySchema), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(updateAdminRoleSvc(db, c.get("userId"), c.req.valid("param").roleId, c.req.valid("json")));
  return c.json({ data, error: null });
});

export default app;
