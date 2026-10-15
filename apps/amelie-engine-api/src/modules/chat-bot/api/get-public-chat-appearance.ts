import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import { getPublicChatAppearanceDoc } from "#/modules/chat-bot/openapi";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getPublicChatAppearanceSvc } from "#/modules/chat-bot/handlers";
import { PublicChatAppearanceQuerySchema } from "@repo/contracts/amelie";

const app = new Hono<AppEnv>();

app.get(
  "/appearance",
  getPublicChatAppearanceDoc,
  zValidator("query", PublicChatAppearanceQuerySchema),
  async (c) => {
    const { slug } = c.req.valid("query");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(getPublicChatAppearanceSvc(db, slug));
    return c.json({ data, error: null });
  },
);

export default app;
