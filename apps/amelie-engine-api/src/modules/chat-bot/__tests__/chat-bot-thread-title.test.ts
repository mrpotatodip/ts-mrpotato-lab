import { describe, expect, it } from "vitest";
import { chatBotThreadTitleFromContent } from "#/modules/chat-bot/lib";

describe("chatBotThreadTitleFromContent", () => {
  it("keeps a short first message", () => {
    expect(chatBotThreadTitleFromContent("How many?")).toBe("How many?");
  });

  it("cuts a long first message to eight words", () => {
    expect(
      chatBotThreadTitleFromContent(
        "How many cards am I watching on this list today?",
      ),
    ).toBe("How many cards am I watching on this");
  });
});
