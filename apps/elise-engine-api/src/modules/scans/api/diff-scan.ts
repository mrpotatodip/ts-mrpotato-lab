import { Hono } from "hono";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { scanDiffDoc, scanDiffSvc } from "#/modules/repos";
import { AccountHeaderSchema, ScanIdParamSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/:scanId/diff", scanDiffDoc, zValidator("header", AccountHeaderSchema), zValidator("param", ScanIdParamSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { scanId } = c.req.valid("param");
  const data = await runEffect(scanDiffSvc(dbConnect(c.env.DATABASE_URL), accountId, scanId));
  return c.json({ data, error: null });
});

export default app;
