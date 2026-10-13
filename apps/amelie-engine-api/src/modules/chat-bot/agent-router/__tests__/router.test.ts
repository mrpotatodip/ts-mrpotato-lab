import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineAgent } from "@tanstack/ai";

import {
  CHAT_BOT_MAIN_ROUTE,
  CHAT_BOT_ROUTE_CONTEXT_TURNS,
  CHAT_BOT_ROUTE_MODEL,
  CHAT_BOT_ROUTE_TIMEOUT_MS,
} from "#/modules/chat-bot/constants";
import { createChatBotJevRouter, toChatBotRouteState } from "#/modules/chat-bot/agent-router";
import type { ChatBotRouteAnswers, ChatBotRouteDecide } from "#/modules/chat-bot/types";

async function* noChunks() {}

const agents = [
  defineAgent({ name: "calculator1", description: "Adds two or three numbers.", run: noChunks }),
  defineAgent({ name: "calculator2", description: "Adds four or more numbers.", run: noChunks }),
];

// -----
// Jev's yes/no per child plus the order
// it picked for when several run.
// -----
function answers(
  yes: ReadonlyArray<string>,
  order: "parallel" | "sequence" = "parallel",
): ChatBotRouteAnswers {
  const byName = Object.fromEntries(
    agents.map((agent) => [agent.name, { value: yes.includes(agent.name) }]),
  );
  // -----
  // SAFETY: RouteAnswers types order as a
  // yes/no too; pick reads it as the order.
  // -----
  return { ...byName, order: { value: order } } as ChatBotRouteAnswers;
}

describe("toChatBotRouteState", () => {
  it("splits the latest user message from the turns before it", () => {
    expect(
      toChatBotRouteState([
        { role: "user", content: "add 2 and 3" },
        { role: "assistant", content: "That comes to 5." },
        { role: "user", content: "and add 4 to that" },
      ]),
    ).toEqual({
      latest_message: "and add 4 to that",
      recent_conversation: [
        { role: "user", content: "add 2 and 3" },
        { role: "assistant", content: "That comes to 5." },
      ],
    });
  });

  it("keeps only the last few turns as context", () => {
    const earlier = Array.from({ length: CHAT_BOT_ROUTE_CONTEXT_TURNS + 3 }, (_, index) => ({
      role: "assistant" as const,
      content: `turn ${index}`,
    }));
    const state = toChatBotRouteState([...earlier, { role: "user", content: "add 1 and 2" }]);
    expect(state?.recent_conversation).toHaveLength(CHAT_BOT_ROUTE_CONTEXT_TURNS);
    expect(state?.recent_conversation.at(-1)?.content).toBe(earlier.at(-1)?.content);
  });

  it("reads the text parts of a UI message", () => {
    expect(
      toChatBotRouteState([
        { id: "u1", role: "user", parts: [{ type: "text", content: "add 2 and 3" }] },
      ]),
    ).toEqual({ latest_message: "add 2 and 3", recent_conversation: [] });
  });

  it("reads the text parts of a model message", () => {
    expect(
      toChatBotRouteState([
        {
          role: "user",
          content: [
            { type: "text", content: "add 2 " },
            { type: "text", content: "and 3" },
          ],
        },
      ]),
    ).toEqual({ latest_message: "add 2 and 3", recent_conversation: [] });
  });

  it("has nothing to route without a user message", () => {
    expect(toChatBotRouteState([])).toBeNull();
  });
});

describe("createChatBotJevRouter", () => {
  const decideRoute = vi.fn<ChatBotRouteDecide>();
  const router = createChatBotJevRouter("ts-key", decideRoute);
  const messages = [{ role: "user" as const, content: "2 + 3?" }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("asks Jev one yes/no per child plus the order", async () => {
    decideRoute.mockResolvedValue(answers(["calculator1"]));
    await router({ messages, agents });

    const options = decideRoute.mock.calls[0]?.[0];
    expect(Object.keys(options?.questions ?? {}).toSorted()).toEqual([
      "calculator1",
      "calculator2",
      "order",
    ]);
    expect(options?.state).toEqual({ latest_message: "2 + 3?", recent_conversation: [] });
    expect(options?.adapter.model).toBe(CHAT_BOT_ROUTE_MODEL);
  });

  it("picks the one child Jev says yes to", async () => {
    decideRoute.mockResolvedValue(answers(["calculator1"]));
    await expect(router({ messages, agents })).resolves.toBe("calculator1");
  });

  it("picks main when Jev says no to every child", async () => {
    decideRoute.mockResolvedValue(answers([]));
    await expect(router({ messages, agents })).resolves.toBe(CHAT_BOT_MAIN_ROUTE);
  });

  it("picks several children in the order Jev chose", async () => {
    decideRoute.mockResolvedValue(answers(["calculator1", "calculator2"], "sequence"));
    await expect(router({ messages, agents })).resolves.toEqual({
      names: ["calculator1", "calculator2"],
      order: "sequence",
    });

    decideRoute.mockResolvedValue(answers(["calculator1", "calculator2"], "parallel"));
    await expect(router({ messages, agents })).resolves.toEqual({
      names: ["calculator1", "calculator2"],
      order: "parallel",
    });
  });

  it("falls back to main when Jev fails", async () => {
    decideRoute.mockRejectedValue(new Error("Jev down"));
    await expect(router({ messages, agents })).resolves.toBe(CHAT_BOT_MAIN_ROUTE);
  });

  it("falls back to main when the route can't be built", async () => {
    const order = defineAgent({ name: "order", description: "Clashes with Jev's order question.", run: noChunks });
    await expect(router({ messages, agents: [order] })).resolves.toBe(CHAT_BOT_MAIN_ROUTE);
    expect(decideRoute).not.toHaveBeenCalled();
  });

  it("falls back to main and aborts Jev when it is too slow", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    decideRoute.mockImplementation((options) => {
      signal = options.abortSignal;
      return new Promise(() => undefined);
    });

    const routed = router({ messages, agents });
    await vi.advanceTimersByTimeAsync(CHAT_BOT_ROUTE_TIMEOUT_MS);

    await expect(routed).resolves.toBe(CHAT_BOT_MAIN_ROUTE);
    expect(signal?.aborted).toBe(true);
  });

  it("aborts Jev when the turn is stopped", async () => {
    let signal: AbortSignal | undefined;
    decideRoute.mockImplementation((options) => {
      signal = options.abortSignal;
      return Promise.resolve(answers([]));
    });
    const stop = new AbortController();

    await router({ messages, agents, abortSignal: stop.signal });
    expect(signal?.aborted).toBe(false);
    stop.abort();

    expect(signal?.aborted).toBe(true);
  });

  it("doesn't call Jev without a user message", async () => {
    await expect(router({ messages: [], agents })).resolves.toBe(CHAT_BOT_MAIN_ROUTE);
    expect(decideRoute).not.toHaveBeenCalled();
  });
});
