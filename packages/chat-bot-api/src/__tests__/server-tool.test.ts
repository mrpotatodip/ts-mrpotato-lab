import { describe, it, expect, vi } from "vitest";
import { toolDefinition } from "@tanstack/ai";
import { Effect } from "effect";
import { z } from "zod";
import {
  CHAT_BOT_MAX_TOOL_CALLS_PER_TURN,
  createChatBotToolBudget,
  defineChatBotTool,
  toChatBotServerTool,
} from "../index";

function budget() {
  return Effect.runSync(createChatBotToolBudget());
}

const runtime = { owner: { kind: "user", scopeId: "scope-1", userId: "u1" } } as const;

type AddTwoRun = (input: { a: number; b: number }) => { a: number; b: number; sum: number };

function addTwo() {
  const run = vi.fn<AddTwoRun>(({ a, b }) => ({ a, b, sum: a + b }));
  const spec = defineChatBotTool({
    definition: toolDefinition({
      name: "addTwoNumbers",
      description: "Add two numbers.",
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.object({ a: z.number(), b: z.number(), sum: z.number() }),
    }),
    run,
  });
  return { spec, run };
}

describe("toChatBotServerTool", () => {
  it("calls the tool's function", async () => {
    const { spec, run } = addTwo();
    const tool = toChatBotServerTool(spec, runtime, budget());
    expect(tool.name).toBe("addTwoNumbers");
    expect(await tool.execute?.({ a: 2, b: 3 })).toEqual({ a: 2, b: 3, sum: 5 });
    expect(run).toHaveBeenCalledWith({ a: 2, b: 3 }, runtime);
  });

  it("returns an error instead of calling on bad input", async () => {
    const { spec, run } = addTwo();
    const tool = toChatBotServerTool(spec, runtime, budget());
    expect(await tool.execute?.({ a: "x" })).toEqual({ error: "invalid input" });
    expect(run).not.toHaveBeenCalled();
  });

  // -----
  // A Zod schema would make TanStack validate
  // first and answer text, not { error }.
  // -----
  it("hands TanStack plain JSON Schema, not the Zod schema", () => {
    const tool = toChatBotServerTool(addTwo().spec, runtime, budget());
    expect(tool.inputSchema).toEqual({
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
      required: ["a", "b"],
    });
    expect(tool.inputSchema).not.toHaveProperty("~standard");
  });

  it("stops after the per-turn budget", async () => {
    const tool = toChatBotServerTool(addTwo().spec, runtime, budget());
    for (let i = 0; i < CHAT_BOT_MAX_TOOL_CALLS_PER_TURN; i += 1) {
      await tool.execute?.({ a: 1, b: 1 });
    }
    expect(await tool.execute?.({ a: 1, b: 1 })).toEqual({
      error: "tool call limit reached for this turn",
    });
  });
});
