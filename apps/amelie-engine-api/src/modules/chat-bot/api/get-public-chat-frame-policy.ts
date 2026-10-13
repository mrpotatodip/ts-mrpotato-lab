import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import { getPublicChatFramePolicyDoc } from "#/modules/chat-bot/openapi";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getPublicChatFramePolicySvc } from "#/modules/chat-bot/handlers";
import { PublicChatFramePolicyQuerySchema } from "@repo/contracts/amelie";

const app = new Hono<AppEnv>();

app.get(
  "/",
  getPublicChatFramePolicyDoc,
  zValidator("query", PublicChatFramePolicyQuerySchema),
  async (c) => {
    const { slug } = c.req.valid("query");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(getPublicChatFramePolicySvc(db, slug));
    return c.json({ data, error: null });
  },
);

export default app;
