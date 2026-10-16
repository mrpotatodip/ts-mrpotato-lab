import { Hono } from "hono";
import { CreateAdminRoleBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { createAdminRoleSvc } from "#/modules/admin-role/handlers";
import { createAdminRoleDoc } from "#/modules/admin-role/openapi";

const app = new Hono<AppEnv>();

app.post("/roles", createAdminRoleDoc, zValidator("json", CreateAdminRoleBodySchema), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(createAdminRoleSvc(db, c.get("userId"), c.req.valid("json")));
  return c.json({ data, error: null }, 201);
});

export default app;
