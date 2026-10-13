import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { createAccountSvc } from "#/modules/sign-up/handlers";
import { createAccountDoc } from "#/modules/sign-up/openapi";
import { requireSignUpLimit } from "#/modules/sign-up/lib";
import { SignUpBodySchema } from "@repo/contracts/amelie";

const app = new Hono<AppEnv>();

app.post("/", createAccountDoc, requireSignUpLimit, zValidator("json", SignUpBodySchema), async (c) => {
  const body = c.req.valid("json");
  // -----
  // Realtime pool: the email check must see
  // an account made a moment ago.
  // -----
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(createAccountSvc(db, body));
  return c.json({ data, error: null }, 201);
});

export default app;
