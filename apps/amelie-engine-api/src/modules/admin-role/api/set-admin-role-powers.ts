import { Hono } from "hono";
import { AdminRoleParamSchema, SetAdminRolePowersBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { setAdminRolePowersSvc } from "#/modules/admin-role/handlers";
import { setAdminRolePowersDoc } from "#/modules/admin-role/openapi";

const app = new Hono<AppEnv>();

app.put("/roles/:roleId/powers", setAdminRolePowersDoc, zValidator("param", AdminRoleParamSchema), zValidator("json", SetAdminRolePowersBodySchema), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(setAdminRolePowersSvc(db, c.get("userId"), c.req.valid("param").roleId, c.req.valid("json").powers));
  return c.json({ data, error: null });
});

export default app;
