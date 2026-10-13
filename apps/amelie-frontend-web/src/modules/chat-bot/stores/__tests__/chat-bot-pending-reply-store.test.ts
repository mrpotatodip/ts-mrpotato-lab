import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// -----
// The store caches storage on first read,
// so each test loads a fresh module.
// -----
const load = async () => ({
  ...(await import("../chat-bot-pending-reply-store")),
  ...(await import("../../hooks/use-chat-bot-pending-reply")),
});

describe("chat-bot pending reply", () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
  });

  afterEach(() => vi.restoreAllMocks());

  it("is null when nothing is pending", async () => {
    const { useChatBotPendingReplyThread } = await load();
    const { result } = renderHook(() => useChatBotPendingReplyThread());
    expect(result.current).toBeNull();
  });

  it("reports and stores the thread a reply is pending for", async () => {
    const { markChatBotPendingReply, useChatBotPendingReplyThread } = await load();
    const { result } = renderHook(() => useChatBotPendingReplyThread());

    act(() => markChatBotPendingReply("thread-1"));

    expect(result.current).toBe("thread-1");
    expect(sessionStorage.getItem("chat-bot:pending-reply")).toBe("thread-1");
  });

  it("survives a reload: a fresh module reads it back", async () => {
    (await load()).markChatBotPendingReply("thread-1");
    vi.resetModules();

    const { useChatBotPendingReplyThread } = await load();
    const { result } = renderHook(() => useChatBotPendingReplyThread());

    expect(result.current).toBe("thread-1");
  });

  it("clears it once the reply is shown", async () => {
    const { clearChatBotPendingReply, markChatBotPendingReply, useChatBotPendingReplyThread } =
      await load();
    markChatBotPendingReply("thread-1");
    const { result } = renderHook(() => useChatBotPendingReplyThread());

    act(() => clearChatBotPendingReply());

    expect(result.current).toBeNull();
    expect(sessionStorage.getItem("chat-bot:pending-reply")).toBeNull();
  });

  it.each([
    ["the run finishes", { type: "RUN_FINISHED", runId: "r", threadId: "t", timestamp: 0 }],
    ["the run fails", { type: "RUN_ERROR", message: "boom", timestamp: 0 }],
  ])("clears it when %s, shown or not", async (_label, chunk) => {
    const { clearChatBotPendingReplyOnRunEnd, markChatBotPendingReply } = await load();
    markChatBotPendingReply("thread-1");

    // -----
    // SAFETY: each case is a StreamChunk-
    // shaped literal.
    // -----
    clearChatBotPendingReplyOnRunEnd(chunk as never);

    expect(sessionStorage.getItem("chat-bot:pending-reply")).toBeNull();
  });

  it.each([
    ["a tool turn ends", { type: "RUN_FINISHED", finishReason: "tool_calls", timestamp: 0 }],
    [
      "a tool turn ends (metadata)",
      { type: "RUN_FINISHED", metadata: { tanstack: { finishReason: "tool_calls" } }, timestamp: 0 },
    ],
    ["text streams", { type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "hi", timestamp: 0 }],
  ])("keeps it while %s", async (_label, chunk) => {
    const { clearChatBotPendingReplyOnRunEnd, markChatBotPendingReply } = await load();
    markChatBotPendingReply("thread-1");

    // -----
    // SAFETY: each case is a StreamChunk-
    // shaped literal.
    // -----
    clearChatBotPendingReplyOnRunEnd(chunk as never);

    expect(sessionStorage.getItem("chat-bot:pending-reply")).toBe("thread-1");
  });

  it("treats blocked storage as nothing pending", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { useChatBotPendingReplyThread } = await load();
    const { result } = renderHook(() => useChatBotPendingReplyThread());

    expect(result.current).toBeNull();
  });
});
