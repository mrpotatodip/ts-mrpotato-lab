import { describe, it, expect } from "vitest";
import { createMCPServer } from "@tanstack/ai-mcp/server";
import { toChatBotMcpTools } from "#/modules/chat-bot/lib";
import * as adminTools from "#/modules/chat-bot/agent-tools/admin";
import { mcpToolSpecs } from "#/modules/mcp/api/handle-mcp";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";

// SAFETY: listing tools never reads the db or owner.
const runtime = {} as ChatBotRuntime;

const rpc = (method: string) =>
  new Request("http://localhost/public/mcp/cafe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: {} }),
  });

describe("public mcp tools", () => {
  it("has no admin tool", () => {
    const adminSpecs = Object.values(adminTools);
    for (const spec of mcpToolSpecs) expect(adminSpecs).not.toContain(spec);
  });

  it("serves every tool over tools/list", async () => {
    const server = createMCPServer({
      name: "amelie",
      version: "1.0.0",
      tools: toChatBotMcpTools(mcpToolSpecs, runtime),
      sessions: "stateless",
    });
    const text = await (await server.handle(rpc("tools/list"))).text();
    for (const spec of mcpToolSpecs) expect(text).toContain(spec.definition.name);
  });
});
