import { Hono } from "hono";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantManager } from "#/lib/require-tenant-manager";
import { zValidator } from "#/lib/zod-validator";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import { listTeamSvc } from "#/modules/team/handlers";
import { listTeamDoc } from "#/modules/team/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/", listTeamDoc, requireTenantManager, zValidator("header", AccountHeaderSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const data = await runEffect(listTeamSvc(dbConnect(c.env.DATABASE_URL), accountId));
  return c.json({ data, error: null });
});

export default app;
