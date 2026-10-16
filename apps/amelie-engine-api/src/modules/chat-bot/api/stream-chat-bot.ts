import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import { streamChatBotDoc } from "#/modules/chat-bot/openapi";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import {
  chatBotDurableStreams,
  chatBotSignedInOwner,
  createChatBotRunner,
} from "#/modules/chat-bot/lib";
import { chatBotStreamQueries } from "#/modules/chat-bot/queries";
import { resolveChatBotPlaceSvc, streamChatBotSvc } from "#/modules/chat-bot/handlers";
import { ChatBotStreamHeaderSchema } from "#/modules/chat-bot/schemas";
import { chatBotMainAgent } from "#/modules/chat-bot/agents";
import { ChatBotStreamQuerySchema } from "@repo/contracts/chat-bots";
import { StaffChatStreamBodySchema } from "@repo/contracts/amelie";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.post(
  "/",
  streamChatBotDoc,
  zValidator("query", ChatBotStreamQuerySchema),
  zValidator("header", ChatBotStreamHeaderSchema),
  zValidator("json", StaffChatStreamBodySchema),
  requirePower("company:assistant:threads:create"),
  async (c) => {
    const body = c.req.valid("json");
    // -----
    // Realtime pool: SSE reads fresh chunks.
    // -----
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const owner = chatBotSignedInOwner(c);
    const place = await runEffect(resolveChatBotPlaceSvc(db, owner.tenantId, body));
    return runEffect(
      streamChatBotSvc({
        db,
        queries: chatBotStreamQueries,
        runner: createChatBotRunner(c.env),
        durableStream: chatBotDurableStreams(db),
        agent: chatBotMainAgent,
        owner,
        locationId: place.locationId,
        countryId: place.countryId,
        body,
        env: c.env,
        waitUntil: (job) => c.executionCtx.waitUntil(job),
        request: c.req.raw,
      }),
    );
  },
);

export default app;
