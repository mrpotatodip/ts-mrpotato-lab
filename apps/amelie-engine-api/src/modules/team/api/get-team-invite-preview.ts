import { Hono } from "hono";
import { TeamInviteTokenParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getTeamInvitePreviewSvc } from "#/modules/team/handlers";
import { getTeamInvitePreviewDoc } from "#/modules/team/openapi";

const app = new Hono<AppEnv>();

app.get("/:token", getTeamInvitePreviewDoc, zValidator("param", TeamInviteTokenParamSchema), async (c) => {
  const { token } = c.req.valid("param");
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(getTeamInvitePreviewSvc(db, token));
  return c.json({ data, error: null });
});

export default app;
