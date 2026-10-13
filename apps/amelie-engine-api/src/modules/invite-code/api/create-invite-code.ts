import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { createInviteCodeSvc } from "#/modules/invite-code/handlers";
import { createInviteCodeDoc } from "#/modules/invite-code/openapi";
import { CreateInviteCodeBodySchema } from "@repo/contracts/amelie";

const app = new Hono<AppEnv>();

app.post("/", createInviteCodeDoc, zValidator("json", CreateInviteCodeBodySchema), async (c) => {
  const body = c.req.valid("json");
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(createInviteCodeSvc(db, c.get("userId"), body));
  return c.json({ data, error: null }, 201);
});

export default app;
