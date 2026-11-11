import { Hono } from "hono";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { listScansSvc } from "#/modules/scans/handlers";
import { listScansDoc } from "#/modules/scans/openapi";
import { AccountHeaderSchema, ScanListQuerySchema } from "#/modules/scans/schemas";

const app = new Hono<AppEnv>();

app.get("/", listScansDoc, zValidator("header", AccountHeaderSchema), zValidator("query", ScanListQuerySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const data = await runEffect(listScansSvc(c.get("deps").scanRepo(c.env), accountId, c.req.valid("query")));
  return c.json({ data, error: null });
});

export default app;
