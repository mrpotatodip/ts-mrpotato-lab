import { Hono } from "hono";
import { AdminAuditQuerySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listAdminAuditLogSvc } from "#/modules/admin-role/handlers";
import { listAdminAuditLogDoc } from "#/modules/admin-role/openapi";

const app = new Hono<AppEnv>();

app.get("/role-audit-log", listAdminAuditLogDoc, zValidator("query", AdminAuditQuerySchema), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listAdminAuditLogSvc(db, c.req.valid("query")));
  return c.json({ data, error: null });
});

export default app;
