import { describe, it, expect, vi } from "vitest";
import { toolDefinition } from "@tanstack/ai";
import { Effect } from "effect";
import { z } from "zod";
import type { ChatBotJson } from "@repo/contracts/chat-bots";
import { InternalServiceError, NotFoundError } from "#/lib/errors";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";

const runtime: ChatBotRuntime = { userId: "user-1" };

const definition = toolDefinition({
  name: "getCardPrice",
  description: "Get a card price.",
  inputSchema: z.strictObject({ cardId: z.string() }),
  outputSchema: z.object({ price: z.number() }),
});

type PriceRun = (
  input: { cardId: string },
  runtime: ChatBotRuntime,
) => ChatBotJson | Promise<ChatBotJson>;

function tool(run: PriceRun, timeoutMs?: number) {
  // -----
  // SAFETY: tests return wrong shapes on
  // purpose to hit the output check.
  // -----
  return defineChatBotTool({ definition, run: run as never, timeoutMs });
}

function execute(spec: ReturnType<typeof tool>, input: Parameters<typeof spec.execute>[0]) {
  return Effect.runPromise(spec.execute(input, runtime));
}

describe("defineChatBotTool", () => {
  it("runs the function with parsed input and the session's userId", async () => {
    const run = vi.fn<PriceRun>(async () => ({ price: 42.5 }));
    expect(await execute(tool(run), { cardId: "c1" })).toEqual({ price: 42.5 });
    expect(run).toHaveBeenCalledWith({ cardId: "c1" }, runtime);
  });

  it("rejects input that fails the input schema, without running", async () => {
    const run = vi.fn<PriceRun>();
    expect(await execute(tool(run), { cardId: 5 })).toEqual({ error: "invalid input" });
    expect(await execute(tool(run), { cardId: "c1", userId: "someone-else" })).toEqual({
      error: "invalid input",
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("logs a rejected call with the tool, thread and field paths, never the values", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const threadRuntime = { ...runtime, threadId: "thread-1" };
    const spec = tool(vi.fn<PriceRun>());

    await Effect.runPromise(spec.execute({ cardId: 5 }, threadRuntime));

    expect(logged).toHaveBeenCalledWith("chat-bot: tool call rejected", {
      tool: "getCardPrice",
      threadId: "thread-1",
      error: "invalid input",
      issues: [{ path: "cardId", code: "invalid_type" }],
    });
    logged.mockRestore();
  });

  it("logs a 4xx AppError the model was shown", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const spec = tool(async () => {
      throw new NotFoundError("Card not found");
    });

    await Effect.runPromise(spec.execute({ cardId: "c1" }, { ...runtime, threadId: "thread-1" }));

    expect(logged).toHaveBeenCalledWith("chat-bot: tool call rejected", {
      tool: "getCardPrice",
      threadId: "thread-1",
      error: "Card not found",
      issues: [],
    });
    logged.mockRestore();
  });

  it("passes a 4xx AppError's message to the model", async () => {
    const spec = tool(async () => {
      throw new NotFoundError("Card not found");
    });
    expect(await execute(spec, { cardId: "c1" })).toEqual({ error: "Card not found" });
  });

  it("hides any other failure behind a generic error, and logs it", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const cause = new InternalServiceError("db down");
    const spec = tool(async () => {
      throw cause;
    });
    expect(await execute(spec, { cardId: "c1" })).toEqual({ error: "tool failed" });
    expect(logged).toHaveBeenCalledWith("chat-bot: tool failed", "getCardPrice", cause);
    logged.mockRestore();
  });

  it("rejects a result that fails the output schema", async () => {
    expect(await execute(tool(() => ({ price: "cheap" })), { cardId: "c1" })).toEqual({
      error: "unexpected response",
    });
  });

  it("times out", async () => {
    const spec = tool(() => new Promise<ChatBotJson>(() => undefined), 50);
    expect(await execute(spec, { cardId: "c1" })).toEqual({ error: "timed out" });
  });

  it("defaults to no display", () => {
    expect(tool(() => ({ price: 1 }))).toMatchObject({ display: null, displayOptions: null });
  });
});
