import { Hono } from "hono";
import { AdminRoleParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getAdminRoleSvc } from "#/modules/admin-role/handlers";
import { getAdminRoleDoc } from "#/modules/admin-role/openapi";

const app = new Hono<AppEnv>();

app.get("/roles/:roleId", getAdminRoleDoc, zValidator("param", AdminRoleParamSchema), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(getAdminRoleSvc(db, c.req.valid("param").roleId));
  return c.json({ data, error: null });
});

export default app;
