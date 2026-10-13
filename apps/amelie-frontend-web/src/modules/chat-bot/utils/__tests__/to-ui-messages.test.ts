import { describe, expect, it } from "vitest";
import { toUiMessages } from "../to-ui-messages";
import type { ChatBotMessage } from "@repo/contracts/chat-bots";

describe("toUiMessages", () => {
  it("maps a user turn to text, and an assistant turn to its answer plus saved cards", () => {
    const rows: ChatBotMessage[] = [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        role: "user",
        content: "What is 2 plus 3?",
        toolsUsed: [],
        structure: null,
        createdAt: "2026-09-04T00:00:00.000Z",
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        role: "assistant",
        content: "That comes to **5**.",
        toolsUsed: ["addTwoNumbers"],
        structure: {
          addTwoNumbers: { display: null, displayOptions: null, results: [{ a: 2, b: 3, sum: 5 }] },
        },
        createdAt: "2026-09-04T00:00:01.000Z",
      },
    ];

    const messages = toUiMessages(rows);
    expect(messages[0]?.parts[0]).toMatchObject({ type: "text", content: "What is 2 plus 3?" });
    expect(messages[0]?.metadata).toBeUndefined();
    expect(messages[1]?.parts[0]).toMatchObject({
      type: "structured-output",
      status: "complete",
      data: { answer: "That comes to **5**." },
    });
    expect(messages[1]?.metadata).toEqual({
      chatBot: {
        toolsUsed: ["addTwoNumbers"],
        structure: {
          addTwoNumbers: { display: null, displayOptions: null, results: [{ a: 2, b: 3, sum: 5 }] },
        },
      },
    });
  });
});
