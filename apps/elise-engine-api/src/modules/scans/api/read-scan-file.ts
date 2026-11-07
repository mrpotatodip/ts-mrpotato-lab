import { Hono } from "hono";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { readScanFileSvc } from "#/modules/scans/handlers";
import { readScanFileDoc } from "#/modules/scans/openapi";
import { AccountHeaderSchema, ScanFileParamSchema } from "#/modules/scans/schemas";
import { scanFileHeaders } from "#/modules/scans/utils";

const app = new Hono<AppEnv>();

app.get("/:scanId/files/:file", readScanFileDoc, zValidator("header", AccountHeaderSchema), zValidator("param", ScanFileParamSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { scanId, file } = c.req.valid("param");
  const { body, contentType } = await runEffect(readScanFileSvc(c.env.REPORTS, c.get("deps").scanRepo(c.env), accountId, scanId, file));
  return new Response(body.body, { headers: scanFileHeaders(file, contentType) });
});

export default app;
