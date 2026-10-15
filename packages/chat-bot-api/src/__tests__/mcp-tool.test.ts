import { describe, it, expect, vi } from "vitest";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { defineChatBotTool, toChatBotMcpTool, toChatBotMcpTools } from "../index";

const runtime = { owner: { kind: "user", scopeId: "scope-1", userId: "u1" } } as const;

function addTwo() {
  const run = vi.fn<(input: { a: number; b: number }) => { sum: number }>(({ a, b }) => ({ sum: a + b }));
  const spec = defineChatBotTool({
    definition: toolDefinition({
      name: "addTwoNumbers",
      description: "Add two numbers.",
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.object({ sum: z.number() }),
    }),
    run,
  });
  return { spec, run };
}

describe("toChatBotMcpTool", () => {
  it("calls the tool's function with the request's runtime", async () => {
    const { spec, run } = addTwo();
    const tool = toChatBotMcpTool(spec, runtime);
    expect(tool.name).toBe("addTwoNumbers");
    expect(await tool.execute?.({ a: 2, b: 3 })).toEqual({ sum: 5 });
    expect(run).toHaveBeenCalledWith({ a: 2, b: 3 }, runtime);
  });

  it("returns an error instead of calling on bad input", async () => {
    const { spec, run } = addTwo();
    const tool = toChatBotMcpTool(spec, runtime);
    expect(await tool.execute?.({ a: "x" })).toEqual({ error: "invalid input" });
    expect(run).not.toHaveBeenCalled();
  });

  it("has no call limit", async () => {
    const tool = toChatBotMcpTool(addTwo().spec, runtime);
    for (let i = 0; i < 100; i++) {
      expect(await tool.execute?.({ a: i, b: 1 })).toEqual({ sum: i + 1 });
    }
  });

  it("maps every spec", () => {
    const { spec } = addTwo();
    expect(toChatBotMcpTools([spec, spec], runtime)).toHaveLength(2);
  });
});
