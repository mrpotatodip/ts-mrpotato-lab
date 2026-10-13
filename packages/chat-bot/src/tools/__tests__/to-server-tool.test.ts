import { describe, it, expect, vi } from "vitest";
import { Effect } from "effect";
import { CHAT_BOT_MAX_TOOL_CALLS_PER_TURN } from "../constants";
import { createChatBotToolBudget, toChatBotServerTool } from "../to-server-tool";
import type { ChatBotRuntime, ChatBotToolSpec } from "../../lib";

function budget() {
  return Effect.runSync(createChatBotToolBudget());
}

const addTwo: ChatBotToolSpec = {
  id: "tool-1",
  name: "addTwoNumbers",
  description: "Add two numbers.",
  method: "GET",
  path: "/chat-bot-tools/add-two-numbers",
  inputSchema: {
    type: "object",
    properties: { a: { type: "number" }, b: { type: "number" } },
    required: ["a", "b"],
  },
  resultSchema: null,
  display: null,
  displayOptions: null,
  timeoutMs: null,
};

function runtime(): ChatBotRuntime {
  return {
    userId: "u1",
    allowedPathPrefix: "/chat-bot-tools/",
    fetch: vi.fn<ChatBotRuntime["fetch"]>(async () =>
      Response.json({ data: { a: 2, b: 3, sum: 5 }, error: null }),
    ),
  };
}

describe("toChatBotServerTool", () => {
  it("calls the tool's endpoint", async () => {
    const rt = runtime();
    const tool = toChatBotServerTool(addTwo, rt, budget());
    expect(tool.name).toBe("addTwoNumbers");
    expect(await tool.execute?.({ a: 2, b: 3 })).toEqual({ a: 2, b: 3, sum: 5 });
    expect(rt.fetch).toHaveBeenCalledWith(
      "/chat-bot-tools/add-two-numbers?a=2&b=3&userId=u1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns an error instead of calling on bad input", async () => {
    const rt = runtime();
    const tool = toChatBotServerTool(addTwo, rt, budget());
    expect(await tool.execute?.({ a: "x" })).toEqual({ error: expect.any(String) });
    expect(rt.fetch).not.toHaveBeenCalled();
  });

  it("stops after the per-turn budget", async () => {
    const tool = toChatBotServerTool(addTwo, runtime(), budget());
    for (let i = 0; i < CHAT_BOT_MAX_TOOL_CALLS_PER_TURN; i += 1) {
      await tool.execute?.({ a: 1, b: 1 });
    }
    expect(await tool.execute?.({ a: 1, b: 1 })).toEqual({
      error: "tool call limit reached for this turn",
    });
  });
});
