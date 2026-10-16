import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import { deleteChatBotThreadDoc } from "#/modules/chat-bot/openapi";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { chatBotSignedInOwner } from "#/modules/chat-bot/lib";
import { deleteChatBotThreadSvc } from "#/modules/chat-bot/handlers";
import { ChatBotThreadParamSchema } from "@repo/contracts/chat-bots";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.delete(
  "/threads/:id",
  deleteChatBotThreadDoc,
  requirePower("company:assistant:threads:delete"),
  zValidator("param", ChatBotThreadParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    // -----
    // Realtime pool (ADR-0018), the same
    // pool the thread list reads this from.
    // -----
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(deleteChatBotThreadSvc(db, chatBotSignedInOwner(c), id));
    return c.json({ data, error: null });
  },
);

export default app;
