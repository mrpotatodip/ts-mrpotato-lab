import { Hono } from "hono";
import { createMCPServer } from "@tanstack/ai-mcp/server";
import type { AppEnv } from "#/types/variables";
import { zValidator } from "#/lib/zod-validator";
import { db_connect } from "#/lib/db-connection";
import { RateLimited, runEffect } from "#/lib/effect-query";
import { findPublicTenantSvc } from "#/modules/tenant";
import {
  publicChatClientIp,
  publicChatLimiters,
  toChatBotMcpTools,
} from "#/modules/chat-bot/lib";
import {
  findMenuItemsTool,
  getBusinessProfileTool,
  getOpeningScheduleTool,
  listFaqsTool,
  listMenuTool,
  listTenantsTool,
} from "#/modules/chat-bot/agent-tools";
import {
  CHAT_BOT_PUBLIC_RATE_LIMITED,
  CHAT_BOT_PUBLIC_RATE_LIMITED_MESSAGE,
} from "#/modules/chat-bot/constants";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "#/modules/mcp/constants";
import { McpTenantParamSchema } from "#/modules/mcp/schemas";

// -----
// Only reads of what the Tenant already shows
// the public: no admin/ tool, no widget display
// or reporting tool.
// -----
export const mcpToolSpecs = [
  listTenantsTool,
  getBusinessProfileTool,
  getOpeningScheduleTool,
  listMenuTool,
  findMenuItemsTool,
  listFaqsTool,
];

const app = new Hono<AppEnv>();

// -----
// No login: the Tenant comes from the slug, and
// the call is limited per IP like a widget message.
// -----
app.all("/:slug", zValidator("param", McpTenantParamSchema), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const tenant = await runEffect(findPublicTenantSvc(db, c.req.valid("param").slug));
  const ip = publicChatClientIp(c.req.header("cf-connecting-ip"));
  const allowed = await publicChatLimiters(c.env).message(`mcp:${ip}`);
  if (!allowed) {
    throw new RateLimited({
      code: CHAT_BOT_PUBLIC_RATE_LIMITED,
      message: CHAT_BOT_PUBLIC_RATE_LIMITED_MESSAGE,
    });
  }
  const runtime = {
    db,
    owner: {
      kind: "anonymous" as const,
      tenantId: tenant.id,
      anonymousId: `mcp:${ip}`,
    },
  };
  const server = createMCPServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    tools: toChatBotMcpTools(mcpToolSpecs, runtime),
    sessions: "stateless",
    onerror: (error) => console.error("mcp: server error", error),
  });
  return server.handle(c.req.raw);
});

export default app;
