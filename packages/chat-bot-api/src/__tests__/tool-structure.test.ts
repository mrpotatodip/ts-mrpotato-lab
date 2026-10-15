import { describe, it, expect } from "vitest";
import { ChatBotStructureSchema } from "../contracts";
import { appendChatBotToolResult, parseChatBotToolResultContent } from "../index";

describe("appendChatBotToolResult", () => {
  it("keeps every call of a tool in order", () => {
    const entry = { display: "number" as const, displayOptions: { value: "price" } };
    let structure = appendChatBotToolResult({}, "getCardPrice", entry, { price: 1 });
    structure = appendChatBotToolResult(structure, "getCardPrice", entry, { error: "timed out" });
    structure = appendChatBotToolResult(structure, "addTwoNumbers", {
      display: null,
      displayOptions: null,
    }, { a: 2, b: 3, sum: 5 });

    expect(structure).toEqual({
      getCardPrice: {
        display: "number",
        displayOptions: { value: "price" },
        results: [{ price: 1 }, { error: "timed out" }],
      },
      addTwoNumbers: {
        display: null,
        displayOptions: null,
        results: [{ a: 2, b: 3, sum: 5 }],
      },
    });
    expect(ChatBotStructureSchema.safeParse(structure).success).toBe(true);
  });
});

describe("parseChatBotToolResultContent", () => {
  it("parses JSON text and keeps other text", () => {
    expect(parseChatBotToolResultContent('{"sum":5}')).toEqual({ sum: 5 });
    expect(parseChatBotToolResultContent("plain")).toBe("plain");
    expect(parseChatBotToolResultContent({ sum: 5 })).toEqual({ sum: 5 });
  });
});
