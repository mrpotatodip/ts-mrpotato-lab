import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import { hydrateOrJoinChatBotDoc } from "#/modules/chat-bot/openapi";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { chatBotDurableStreams, chatBotSignedInOwner } from "#/modules/chat-bot/lib";
import { hydrateOrJoinChatBotSvc } from "#/modules/chat-bot/handlers";
import { ChatBotStreamHeaderSchema } from "#/modules/chat-bot/schemas";
import { ChatBotStreamQuerySchema } from "@repo/contracts/chat-bots";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.get(
  "/",
  hydrateOrJoinChatBotDoc,
  zValidator("query", ChatBotStreamQuerySchema),
  zValidator("header", ChatBotStreamHeaderSchema),
  requirePower("company:assistant:threads:read"),
  async (c) => {
    const { threadId } = c.req.valid("query");
    // -----
    // Realtime pool: a rejoin reads fresh chunks.
    // -----
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    return runEffect(
      hydrateOrJoinChatBotSvc(db, chatBotDurableStreams(db), chatBotSignedInOwner(c), threadId, c.req.raw),
    );
  },
);

export default app;
