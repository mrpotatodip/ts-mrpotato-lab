import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { revokeInviteCodeSvc } from "#/modules/invite-code/handlers";
import { revokeInviteCodeDoc } from "#/modules/invite-code/openapi";
import { InviteCodeParamSchema } from "@repo/contracts/amelie";

const app = new Hono<AppEnv>();

// -----
// POST, not DELETE: the row stays as history.
// -----
app.post("/:id/revoke", revokeInviteCodeDoc, zValidator("param", InviteCodeParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(revokeInviteCodeSvc(db, id));
  return c.json({ data, error: null });
});

export default app;
