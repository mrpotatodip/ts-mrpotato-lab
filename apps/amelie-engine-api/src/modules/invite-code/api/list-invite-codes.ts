import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listInviteCodesSvc } from "#/modules/invite-code/handlers";
import { listInviteCodesDoc } from "#/modules/invite-code/openapi";

const app = new Hono<AppEnv>();

app.get("/", listInviteCodesDoc, async (c) => {
  // -----
  // Realtime pool: a code made or revoked
  // a moment ago must show in the list.
  // -----
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listInviteCodesSvc(db));
  return c.json({ data, error: null });
});

export default app;
