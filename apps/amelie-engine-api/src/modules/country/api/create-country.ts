import { Hono } from "hono";
import { CreateCountryBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { addCountrySvc } from "#/modules/country/handlers";
import { createCountryDoc } from "#/modules/country/openapi";

const app = new Hono<AppEnv>();

app.post("/", createCountryDoc, requireTenantEditor, zValidator("json", CreateCountryBodySchema), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(addCountrySvc(db, c.get("tenantId"), c.req.valid("json")));
  return c.json({ data, error: null }, 201);
});

export default app;
