import { Hono } from "hono";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { detailScanSvc } from "#/modules/scans/handlers";
import { detailScanDoc } from "#/modules/scans/openapi";
import { AccountHeaderSchema, ScanIdParamSchema } from "#/modules/scans/schemas";

const app = new Hono<AppEnv>();

app.get("/:scanId", detailScanDoc, zValidator("header", AccountHeaderSchema), zValidator("param", ScanIdParamSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { scanId } = c.req.valid("param");
  const data = await runEffect(detailScanSvc(c.env, c.get("deps").scanRepo(c.env), accountId, scanId));
  return c.json({ data, error: null });
});

export default app;
