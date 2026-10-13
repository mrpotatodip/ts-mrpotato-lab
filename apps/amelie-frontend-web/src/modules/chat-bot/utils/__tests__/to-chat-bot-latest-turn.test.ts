import { describe, expect, it } from "vitest";
import type { UIMessage } from "@tanstack/ai-client";
import { toChatBotLatestTurn } from "../to-chat-bot-latest-turn";

const message = (id: string, role: UIMessage["role"]): UIMessage => ({ id, role, parts: [] });

describe("toChatBotLatestTurn", () => {
  it("names the latest user message and the replies after it", () => {
    const turn = toChatBotLatestTurn([
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
      message("a3", "assistant"),
    ]);

    expect(turn).toEqual({ lastUserId: "u2", replyIds: new Set(["a2", "a3"]) });
  });

  it("has no replies while the latest user message waits", () => {
    expect(toChatBotLatestTurn([message("a1", "assistant"), message("u1", "user")])).toEqual({
      lastUserId: "u1",
      replyIds: new Set(),
    });
  });

  it("treats every message as a reply when there is no user message", () => {
    expect(toChatBotLatestTurn([message("a1", "assistant")])).toEqual({
      lastUserId: undefined,
      replyIds: new Set(["a1"]),
    });
  });
});
