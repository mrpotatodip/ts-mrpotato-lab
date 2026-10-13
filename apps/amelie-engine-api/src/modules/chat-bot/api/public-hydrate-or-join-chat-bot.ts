import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import { publicHydrateOrJoinChatBotDoc } from "#/modules/chat-bot/openapi";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { chatBotDurableStreams, publicChatOwnOrigins } from "#/modules/chat-bot/lib";
import { findPublicChatTenantSvc, hydrateOrJoinChatBotSvc } from "#/modules/chat-bot/handlers";
import { PublicChatHeaderSchema, PublicChatHydrateQuerySchema } from "@repo/contracts/amelie";

const app = new Hono<AppEnv>();

app.get(
  "/",
  publicHydrateOrJoinChatBotDoc,
  zValidator("query", PublicChatHydrateQuerySchema),
  zValidator("header", PublicChatHeaderSchema),
  async (c) => {
    const { slug, threadId } = c.req.valid("query");
    const anonymousId = c.req.valid("header")["x-anonymous-id"];
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const tenant = await runEffect(
      findPublicChatTenantSvc(db, slug, c.req.header("origin"), publicChatOwnOrigins(c.env)),
    );
    return runEffect(
      hydrateOrJoinChatBotSvc(
        db,
        chatBotDurableStreams(db),
        { kind: "anonymous", tenantId: tenant.id, anonymousId },
        threadId,
        c.req.raw,
      ),
    );
  },
);

export default app;
