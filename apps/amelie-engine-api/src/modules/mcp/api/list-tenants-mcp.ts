import { Hono } from "hono";
import { createMCPServer } from "@tanstack/ai-mcp/server";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { RateLimited } from "#/lib/effect-query";
import {
  publicChatClientIp,
  publicChatLimiters,
  toChatBotMcpTools,
} from "#/modules/chat-bot/lib";
import { listTenantsTool } from "#/modules/chat-bot/agent-tools";
import {
  CHAT_BOT_PUBLIC_RATE_LIMITED,
  CHAT_BOT_PUBLIC_RATE_LIMITED_MESSAGE,
} from "#/modules/chat-bot/constants";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "#/modules/mcp/constants";

const app = new Hono<AppEnv>();

// -----
// Where a client starts: the slug to put in
// /public/mcp/:slug. No Tenant is chosen yet, so
// the owner's tenantId is empty; listTenants
// never reads it.
// -----
app.all("/", async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const ip = publicChatClientIp(c.req.header("cf-connecting-ip"));
  if (!(await publicChatLimiters(c.env).message(`mcp:${ip}`))) {
    throw new RateLimited({
      code: CHAT_BOT_PUBLIC_RATE_LIMITED,
      message: CHAT_BOT_PUBLIC_RATE_LIMITED_MESSAGE,
    });
  }
  const runtime = {
    db,
    owner: { kind: "anonymous" as const, tenantId: "", anonymousId: `mcp:${ip}` },
  };
  const server = createMCPServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    tools: toChatBotMcpTools([listTenantsTool], runtime),
    sessions: "stateless",
    onerror: (error) => console.error("mcp: server error", error),
  });
  return server.handle(c.req.raw);
});

export default app;
