import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../chat-bot-upstream", () => ({
  fetchChatBotUpstream: vi.fn<() => Promise<Response>>(async () => new Response("ok")),
}));

import { fetchChatBotUpstream } from "../chat-bot-upstream";
import { proxyChatBotSse } from "../proxy-chat-bot-sse";

afterEach(() => {
  vi.mocked(fetchChatBotUpstream).mockClear();
});

describe("proxyChatBotSse", () => {
  it("forwards the dashboard country and location on a first message", async () => {
    await proxyChatBotSse(
      new Request("http://localhost/api/chat-bot", {
        method: "POST",
        body: JSON.stringify({ content: "Hours?", country: "ca-id", location: "toronto-id" }),
      }),
    );

    expect(fetchChatBotUpstream).toHaveBeenCalledWith(
      "/chat-bot",
      expect.objectContaining({
        body: expect.objectContaining({
          content: "Hours?",
          country: "ca-id",
          location: "toronto-id",
        }),
      }),
    );
  });

  it("still accepts TanStack's wire payload", async () => {
    await proxyChatBotSse(
      new Request("http://localhost/api/chat-bot", {
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", content: "Hours?" }] }] }),
      }),
    );

    expect(fetchChatBotUpstream).toHaveBeenCalledWith(
      "/chat-bot",
      expect.objectContaining({
        body: expect.objectContaining({ content: "Hours?" }),
      }),
    );
  });
});
