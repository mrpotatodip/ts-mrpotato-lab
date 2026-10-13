import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { zValidator } from "#/lib/zod-validator";
import { publicStreamChatBotDoc } from "#/modules/chat-bot/openapi";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { PayloadTooLargeError } from "#/lib/errors";
import {
  chatBotDurableStreams,
  createChatBotRunner,
  publicChatClientIp,
  publicChatLimiters,
  publicChatOwnOrigins,
} from "#/modules/chat-bot/lib";
import { chatBotStreamQueries } from "#/modules/chat-bot/queries";
import { startPublicChatTurnSvc, streamChatBotSvc } from "#/modules/chat-bot/handlers";
import { PublicChatBotStreamHeaderSchema } from "#/modules/chat-bot/schemas";
import {
  CHAT_BOT_CUSTOMER_MODULE,
  CHAT_BOT_CUSTOMER_TRIGGER,
  CHAT_BOT_PUBLIC_BODY_MAX_BYTES,
} from "#/modules/chat-bot/constants";
import { ChatBotStreamQuerySchema } from "@repo/contracts/chat-bots";
import { PublicChatStreamBodySchema } from "@repo/contracts/amelie";

const app = new Hono<AppEnv>();

app.post(
  "/",
  publicStreamChatBotDoc,
  bodyLimit({
    maxSize: CHAT_BOT_PUBLIC_BODY_MAX_BYTES,
    onError: () => {
      throw new PayloadTooLargeError();
    },
  }),
  zValidator("query", ChatBotStreamQuerySchema),
  zValidator("header", PublicChatBotStreamHeaderSchema),
  zValidator("json", PublicChatStreamBodySchema),
  async (c) => {
    const body = c.req.valid("json");
    const headers = c.req.valid("header");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const turn = await runEffect(
      startPublicChatTurnSvc({
        db,
        slug: body.slug,
        origin: c.req.header("origin"),
        ownOrigins: publicChatOwnOrigins(c.env),
        anonymousId: headers["x-anonymous-id"],
        runId: headers["x-run-id"],
        threadId: body.threadId,
        location: body.location,
        country: body.country,
        ip: publicChatClientIp(c.req.header("cf-connecting-ip")),
        limiters: publicChatLimiters(c.env),
      }),
    );
    return runEffect(
      streamChatBotSvc({
        db,
        queries: chatBotStreamQueries,
        runner: createChatBotRunner(c.env),
        durableStream: chatBotDurableStreams(db),
        ...turn,
        body: {
          threadId: body.threadId,
          content: body.content,
          trigger: CHAT_BOT_CUSTOMER_TRIGGER,
          module: CHAT_BOT_CUSTOMER_MODULE,
        },
        env: c.env,
        waitUntil: (job) => c.executionCtx.waitUntil(job),
        request: c.req.raw,
      }),
    );
  },
);

export default app;
