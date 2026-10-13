import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import { getChatBotThreadDoc } from "#/modules/chat-bot/openapi";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { chatBotSignedInOwner } from "#/modules/chat-bot/lib";
import { getChatBotThreadSvc } from "#/modules/chat-bot/handlers";
import { ChatBotThreadParamSchema } from "@repo/contracts/chat-bots";

const app = new Hono<AppEnv>();

app.get(
  "/threads/:id",
  getChatBotThreadDoc,
  zValidator("param", ChatBotThreadParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    // -----
    // Realtime pool (ADR-0018): thread reads
    // must see a rename or delete at once.
    // -----
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(getChatBotThreadSvc(db, chatBotSignedInOwner(c), id));
    return c.json({ data, error: null });
  },
);

export default app;
