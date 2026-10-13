import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import { updateChatBotThreadTitleDoc } from "#/modules/chat-bot/openapi";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { chatBotSignedInOwner } from "#/modules/chat-bot/lib";
import { updateChatBotThreadTitleSvc } from "#/modules/chat-bot/handlers";
import {
  ChatBotThreadParamSchema,
  ChatBotTitleBodySchema,
} from "@repo/contracts/chat-bots";

const app = new Hono<AppEnv>();

app.patch(
  "/threads/:id",
  updateChatBotThreadTitleDoc,
  zValidator("param", ChatBotThreadParamSchema),
  zValidator("json", ChatBotTitleBodySchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { title } = c.req.valid("json");
    // -----
    // Realtime pool (ADR-0018), the same
    // pool the thread list reads this from.
    // -----
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(
      updateChatBotThreadTitleSvc(db, chatBotSignedInOwner(c), id, title),
    );
    return c.json({ data, error: null });
  },
);

export default app;
