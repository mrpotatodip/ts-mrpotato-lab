import { Hono } from "hono";
import { SignUpBodySchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { createAccountSvc } from "#/modules/sign-up/handlers";
import { createAccountDoc } from "#/modules/sign-up/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.post("/", createAccountDoc, zValidator("json", SignUpBodySchema), async (c) => {
  const body = c.req.valid("json");
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(createAccountSvc(db, body)),
  );
  return c.json({ data, error: null }, 201);
});

export default app;
