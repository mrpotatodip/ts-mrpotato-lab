import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import { listChatBotThreadsDoc } from "#/modules/chat-bot/openapi";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { chatBotSignedInOwner } from "#/modules/chat-bot/lib";
import { listChatBotThreadsSvc } from "#/modules/chat-bot/handlers";
import { ChatBotThreadsQuerySchema } from "@repo/contracts/chat-bots";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.get(
  "/threads",
  listChatBotThreadsDoc,
  requirePower("company:assistant:threads:read"),
  zValidator("query", ChatBotThreadsQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    // -----
    // Realtime pool (ADR-0018): thread reads
    // must see a rename or delete at once.
    // -----
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(listChatBotThreadsSvc(db, chatBotSignedInOwner(c), query));
    return c.json({ data, error: null });
  },
);

export default app;
